import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { createServiceClient } from '@/lib/supabase';
import { parseImmoScoutEmail } from '@/lib/email-parser';

const PRE_FILTER_MAX_EUR_QM = 2700;
// Beim allerersten Lauf: so weit zurückschauen
const FIRST_RUN_LOOKBACK_DAYS = 7;

// Vercel ruft Cron-Jobs mit dem CRON_SECRET als Bearer-Token auf.
// Für manuelle Browser-Tests wird auch ?secret=... als Query-Parameter akzeptiert.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // kein Secret gesetzt → lokal testen erlaubt

  // 1. Authorization-Header (wird von Vercel Cron automatisch gesetzt)
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  // 2. Query-Parameter (für manuelle Browser-Tests: ?secret=...)
  const querySecret = request.nextUrl.searchParams.get('secret');
  if (querySecret === secret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Konfiguration prüfen
  const imapHost = process.env.IMAP_HOST || 'imap.gmx.net';
  const imapPort = Number(process.env.IMAP_PORT) || 993;
  const imapUser = process.env.IMAP_USER;
  const imapPass = process.env.IMAP_PASSWORD;

  if (!imapUser || !imapPass) {
    return NextResponse.json(
      { error: 'IMAP_USER oder IMAP_PASSWORD nicht konfiguriert' },
      { status: 500 }
    );
  }

  const supabase = createServiceClient();

  const stats = {
    emails_checked: 0,
    properties_created: 0,
    properties_skipped_prefilter: 0,
    properties_duplicate: 0,
    since: '',
    errors: [] as string[],
  };

  // ── Letzten Check-Zeitpunkt aus der DB laden ────────────────────────────────
  const { data: lastCheckSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'last_email_check')
    .maybeSingle();

  // Beim ersten Lauf: FIRST_RUN_LOOKBACK_DAYS Tage zurückschauen
  // Danach: ab dem letzten erfolgreichen Check suchen
  const sinceDate = lastCheckSetting?.value
    ? new Date(lastCheckSetting.value as string)
    : new Date(Date.now() - FIRST_RUN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  stats.since = sinceDate.toISOString();

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Datumbasierte Suche — unabhängig vom Gelesen-Status
      // search() gibt false | number[] zurück — sicher normalisieren
      const searchResult = await client.search(
        { since: sinceDate, from: 'immobilienscout24' },
        { uid: true }
      );
      const uids: number[] = Array.isArray(searchResult) ? searchResult : [];

      if (uids.length === 0) {
        // Auch bei 0 E-Mails den Timestamp aktualisieren
        await updateLastCheck(supabase);
        return NextResponse.json({ message: 'Keine neuen ImmoScout-E-Mails', ...stats });
      }

      // Jede E-Mail verarbeiten
      for await (const message of client.fetch(
        uids.join(','),
        { source: true },
        { uid: true }
      )) {
        try {
          stats.emails_checked++;

          const source = message.source;
          if (!source) continue;

          // E-Mail parsen
          const parsed: ParsedMail = await (
            simpleParser as (src: Buffer) => Promise<ParsedMail>
          )(source);

          // Absender prüfen
          const from = parsed.from?.text?.toLowerCase() ?? '';
          if (!from.includes('immobilienscout24')) continue;

          // HTML-Inhalt extrahieren
          const html = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml ?? '');
          if (!html) continue;

          // Inserate aus E-Mail-HTML parsen
          const properties = parseImmoScoutEmail(html);

          for (const prop of properties) {
            try {
              // Duplikat-Check über ImmoScout-URL (Sicherheitsnetz für Mehrfach-Verarbeitung)
              const { data: existing } = await supabase
                .from('properties')
                .select('id')
                .eq('immoscout_url', prop.immoscout_url)
                .maybeSingle();

              if (existing) {
                stats.properties_duplicate++;
                continue;
              }

              // Pre-Filter: €/m² > 2.700 → als 'skipped' anlegen
              let status: 'preview' | 'skipped' = 'preview';
              if (prop.kaufpreis_eur && prop.wohnflaeche_qm && prop.wohnflaeche_qm > 0) {
                const eurQm = prop.kaufpreis_eur / prop.wohnflaeche_qm;
                if (eurQm > PRE_FILTER_MAX_EUR_QM) {
                  status = 'skipped';
                  stats.properties_skipped_prefilter++;
                }
              }

              // Property anlegen
              const { error: insertError } = await supabase
                .from('properties')
                .insert({ ...prop, status });

              if (insertError) throw insertError;
              stats.properties_created++;
            } catch (propErr) {
              const msg = propErr instanceof Error ? propErr.message : String(propErr);
              stats.errors.push(`Property ${prop.immoscout_url}: ${msg}`);
            }
          }
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          stats.errors.push(`E-Mail-Verarbeitung: ${msg}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // ── Letzten Check-Zeitpunkt speichern (nur bei Erfolg) ──────────────────
    await updateLastCheck(supabase);

    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('check-emails Fehler:', err);
    // Kein updateLastCheck bei Fehler → nächster Lauf wiederholt ab sinceDate
    try { await client.logout(); } catch { /* ignore */ }
    return NextResponse.json({ error: msg, ...stats }, { status: 500 });
  }
}

async function updateLastCheck(supabase: ReturnType<typeof createServiceClient>) {
  await supabase
    .from('app_settings')
    .upsert(
      { key: 'last_email_check', value: new Date().toISOString() },
      { onConflict: 'key' }
    );
}
