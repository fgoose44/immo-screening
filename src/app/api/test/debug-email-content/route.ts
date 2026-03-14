import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { parseImmoScoutEmail } from '@/lib/email-parser';

// Gibt den kompletten HTML-Body der neuesten ImmoScout-E-Mail zurück.
// Kein Auth — Test-Only.
export async function GET() {
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
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = status.messages ?? 0;

      if (totalMessages === 0) {
        return NextResponse.json({ error: 'Posteingang ist leer' }, { status: 404 });
      }

      // Die letzten 50 E-Mails per Envelope scannen, neueste ImmoScout-E-Mail finden
      const start = Math.max(1, totalMessages - 49);
      const range = `${start}:${totalMessages}`;

      let targetUid: number | null = null;
      let targetEnvelope: { from: string; subject: string; date: string | null } | null = null;

      // Alle Envelope-Daten laden, dann die neueste ImmoScout-Mail identifizieren
      const candidates: { uid: number; from: string; subject: string; date: Date | null }[] = [];

      for await (const message of client.fetch(range, { envelope: true, uid: true })) {
        const env = message.envelope;
        const from = env?.from?.map((a) => `${a.name ?? ''} <${a.address ?? ''}>`.trim()).join(', ') ?? '';
        if (from.toLowerCase().includes('immobilienscout24.de')) {
          candidates.push({
            uid: message.uid,
            from,
            subject: env?.subject ?? '—',
            date: env?.date ?? null,
          });
        }
      }

      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'Keine ImmoScout-E-Mail in den letzten 50 E-Mails gefunden' },
          { status: 404 }
        );
      }

      // Neueste E-Mail auswählen (höchste UID = jüngste)
      const newest = candidates.sort((a, b) => b.uid - a.uid)[0];
      targetUid = newest.uid;
      targetEnvelope = {
        from: newest.from,
        subject: newest.subject,
        date: newest.date ? newest.date.toISOString() : null,
      };

      // Vollständige E-Mail (source) laden
      let html = '';
      let textAsHtml = '';
      let text = '';
      let attachments: string[] = [];

      for await (const message of client.fetch(String(targetUid), { source: true }, { uid: true })) {
        const source = message.source;
        if (!source) break;

        const parsed: ParsedMail = await (
          simpleParser as (src: Buffer) => Promise<ParsedMail>
        )(source);

        html = typeof parsed.html === 'string' ? parsed.html : '';
        textAsHtml = parsed.textAsHtml ?? '';
        text = parsed.text ?? '';
        attachments = parsed.attachments?.map((a) => `${a.filename} (${a.contentType})`) ?? [];
      }

      // Parser-Ergebnis direkt mitliefern — so können wir den Parser live testen
      const htmlBody = html || textAsHtml;
      const parsedProperties = htmlBody ? parseImmoScoutEmail(htmlBody) : [];

      return NextResponse.json({
        uid: targetUid,
        envelope: targetEnvelope,
        has_html: html.length > 0,
        has_text: text.length > 0,
        html_length: html.length,
        text_length: text.length,
        attachments,
        // Parser-Ergebnis: wie viele Inserate wurden gefunden?
        parser_found: parsedProperties.length,
        parser_results: parsedProperties,
        // Kompletter HTML-Body zum manuellen Debuggen
        html_body: htmlBody,
      });
    } finally {
      lock.release();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('debug-email-content Fehler:', err);
    try { await client.logout(); } catch { /* ignore */ }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await client.logout();
}
