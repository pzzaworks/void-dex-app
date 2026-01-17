import { NextResponse } from 'next/server';

// Broadcaster HTTP API port (not nwaku's 8546)
const BROADCASTER_HTTP_API = process.env.BROADCASTER_HTTP_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3010' : '');

export async function GET() {
  if (!BROADCASTER_HTTP_API) {
    return NextResponse.json({ error: 'Broadcaster API URL not configured' }, { status: 500 });
  }

  try {
    // Fetch from broadcaster's HTTP API directly
    const response = await fetch(`${BROADCASTER_HTTP_API}/fees`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Broadcaster not available' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] Broadcaster fees error:', err);
    return NextResponse.json({ error: 'Could not reach broadcaster' }, { status: 502 });
  }
}
