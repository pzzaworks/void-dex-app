import { NextRequest, NextResponse } from 'next/server';

// Broadcaster HTTP API URL
const BROADCASTER_HTTP_API = process.env.BROADCASTER_HTTP_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3010' : '');

/**
 * POST /api/broadcaster/submit
 * Proxy transaction submission to self-hosted broadcaster for testnet
 */
export async function POST(request: NextRequest) {
  if (!BROADCASTER_HTTP_API) {
    return NextResponse.json(
      { error: 'Broadcaster API URL not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.to || !body.data || !body.chainId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, data, chainId' },
        { status: 400 }
      );
    }

    // Forward to broadcaster's HTTP API
    const response = await fetch(`${BROADCASTER_HTTP_API}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for tx submission
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[API] Broadcaster submission failed:', data);
      return NextResponse.json(
        { error: data.error || 'Transaction submission failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] Broadcaster submit error:', err);
    return NextResponse.json(
      { error: 'Could not reach broadcaster' },
      { status: 502 }
    );
  }
}
