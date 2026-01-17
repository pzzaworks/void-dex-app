import { NextResponse } from 'next/server';

const BROADCASTER_API_URL = process.env.NEXT_PUBLIC_BROADCASTER_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8546' : '');

export async function GET() {
  if (!BROADCASTER_API_URL) {
    return NextResponse.json({ error: 'Broadcaster URL not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${BROADCASTER_API_URL}/debug/v1/info`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Broadcaster not available' }, { status: 502 });
    }

    const data = await response.json();

    // For local development, replace 127.0.0.1 with localhost for browser compatibility
    if (data.listenAddresses && process.env.NODE_ENV === 'development') {
      data.listenAddresses = data.listenAddresses.map((addr: string) =>
        addr.replace('/ip4/127.0.0.1/', '/dns4/localhost/')
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not reach broadcaster' }, { status: 502 });
  }
}
