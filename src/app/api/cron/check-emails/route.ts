import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { createServiceClient } from '@/lib/supabase';
import { parseImmoScoutEmail } from '@/lib/email-parser';

const PRE_FILTER_MAX_EUR_QM = 2700;

// Vercel ruft Cron-Jobs mit dem CRON_SECRET als Bearer-Token auf
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // kein Secret gesetzt → lokal testen erlaubt
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
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

  const stats = {
    emails_checked: 0,
    properties_created: 0,
    properties_skipped_prefilter: 0,
    properties_duplicate: 0,
    errors: [] as string[],
  };

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
      // Ungelesene E-Mails von ImmoScout24 suchen
      // search() gibt false | number[] zurück — sicher normalisieren
      const searchResult = await client.search(
        { seen: false, from: 'immobilienscout24' },
        { uid: true }
      );
      const uids: number[] = Array.isArray(searchResult) ? searchResult : [];

      if (uids.length === 0) {
        return NextResponse.json({ message: 'Keine neuen ImmoScout-E-Mails', ...stats });
      }

      const supabase = createServiceClient();

      // Jede E-Mail verarbeiten
      for await (const message of client.fetch(
        uids.join(','),
        { source: true },
        { uid: true }
      )) {
        try {
          stats.emails_checked++;

          // Source prüfen (wird durch { source: true } immer gesetzt, aber TypeScript prüft)
          const source = message.source;
          if (!source) continue;

          // E-Mail parsen — explizite Typisierung um Overload-Ambiguität zu vermeiden
          const parsed: ParsedMail = await (
            simpleParser as (src: Buffer) => Promise<ParsedMail>
          )(source);

          // Absender nochmals prüfen (Sicherheitsnetz)
          const from = parsed.from?.text?.toLowerCase() ?? '';
          if (!from.includes('immobilienscout24')) {
            await client.messageFlagsAdd(String(message.uid), ['\\Seen'], { uid: true });
            continue;
          }

          // HTML-Inhalt extrahieren
          const html = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml ?? '');
          if (!html) {
            await client.messageFlagsAdd(String(message.uid), ['\\Seen'], { uid: true });
            continue;
          }

          // Inserate aus E-Mail-HTML parsen
          const properties = parseImmoScoutEmail(html);

          for (const prop of properties) {
            try {
              // Duplikat-Check über ImmoScout-URL
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

          // E-Mail als gelesen markieren
          await client.messageFlagsAdd(String(message.uid), ['\\Seen'], { uid: true });
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          stats.errors.push(`E-Mail-Verarbeitung: ${msg}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('check-emails Fehler:', err);
    try { await client.logout(); } catch { /* ignore */ }
    return NextResponse.json({ error: msg, ...stats }, { status: 500 });
  }
}
