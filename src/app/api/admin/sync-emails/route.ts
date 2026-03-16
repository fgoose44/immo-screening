import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/sync-emails
 *
 * Interner Endpoint für den manuellen E-Mail-Abruf vom Dashboard.
 * Ruft den Cron-Job-Endpoint mit dem CRON_SECRET serverseitig auf —
 * das Secret bleibt niemals im Client-Bundle.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const baseUrl = request.nextUrl.origin;

  const headers: HeadersInit = secret
    ? { Authorization: `Bearer ${secret}` }
    : {};

  try {
    const res = await fetch(`${baseUrl}/api/cron/check-emails`, { headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
