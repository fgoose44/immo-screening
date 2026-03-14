import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { createServiceClient } from '@/lib/supabase';
import { parseImmoScoutEmail } from '@/lib/email-parser';

const PRE_FILTER_MAX_EUR_QM = 2700;
const BACKFILL_DAYS = 5;

// Kein Auth-Check — Test-Only-Endpoint
export async function GET() {
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
    uids_found: 0,            // UIDs vom IMAP-Search zurückgegeben
    emails_checked: 0,        // E-Mails die vom From-Filter durchgelassen wurden
    properties_parsed: 0,     // Inserate die der HTML-Parser gefunden hat
    properties_created: 0,    // Erfolgreich in DB geschrieben
    properties_skipped_prefilter: 0,
    properties_duplicate: 0,  // Bereits in DB vorhanden (immoscout_url UNIQUE)
    since: '',
    errors: [] as string[],
  };

  // Immer die letzten BACKFILL_DAYS Tage abrufen — ignoriert last_email_check
  const sinceDate = new Date(Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000);
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
      // Nur nach Datum filtern — Absender-Check erfolgt nach dem Parsen im Code.
      // Kombination since+from ist auf GMX-IMAP unzuverlässig.
      const searchResult = await client.search(
        { since: sinceDate },
        { uid: true }
      );
      const uids: number[] = Array.isArray(searchResult) ? searchResult : [];
      stats.uids_found = uids.length;

      if (uids.length === 0) {
        return NextResponse.json({
          message: `Keine E-Mails der letzten ${BACKFILL_DAYS} Tage gefunden`,
          ...stats,
        });
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

          // Absender prüfen — matcht auf "immobilienscout24.de" im From-Feld
          // (z.B. "myscout@immobilienscout24.de" oder "noreply@immobilienscout24.de")
          const from = parsed.from?.text?.toLowerCase() ?? '';
          if (!from.includes('immobilienscout24.de')) continue;

          // HTML-Inhalt extrahieren
          const html = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml ?? '');
          if (!html) continue;

          // Inserate aus E-Mail-HTML parsen
          const properties = parseImmoScoutEmail(html);
          stats.properties_parsed += properties.length;

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
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          stats.errors.push(`E-Mail-Verarbeitung: ${msg}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // last_email_check wird NICHT aktualisiert — das ist ein Test-Endpoint
    return NextResponse.json({ success: true, backfill_days: BACKFILL_DAYS, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('backfill-emails Fehler:', err);
    try { await client.logout(); } catch { /* ignore */ }
    return NextResponse.json({ error: msg, ...stats }, { status: 500 });
  }
}
