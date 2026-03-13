import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

const FETCH_COUNT = 40;

// Debug-Endpoint: listet die letzten N E-Mails im Posteingang auf
// Kein Auth — Test-Only
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
    let emails: { uid: number; from: string; subject: string; date: string | null }[] = [];

    try {
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = status.messages ?? 0;

      if (totalMessages === 0) {
        return NextResponse.json({ total_in_inbox: 0, emails: [] });
      }

      // Die letzten FETCH_COUNT E-Mails via Sequenz-Range holen
      const start = Math.max(1, totalMessages - FETCH_COUNT + 1);
      const range = `${start}:${totalMessages}`;

      for await (const message of client.fetch(range, {
        envelope: true,
        uid: true,
      })) {
        const env = message.envelope;
        const from = env?.from?.map((a) => `${a.name ?? ''} <${a.address ?? ''}>`.trim()).join(', ') ?? '—';
        const subject = env?.subject ?? '—';
        const date = env?.date ? env.date.toISOString() : null;

        emails.push({ uid: message.uid, from, subject, date });
      }

      // Neueste zuerst
      emails = emails.reverse();
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      total_fetched: emails.length,
      imap_host: imapHost,
      imap_user: imapUser,
      emails,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('debug-emails Fehler:', err);
    try { await client.logout(); } catch { /* ignore */ }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
