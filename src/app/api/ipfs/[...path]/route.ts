import { NextRequest, NextResponse } from 'next/server';

// IPFS gateways to try (server-side, no CORS issues)
// RAILGUN's official gateway first for better reliability
const GATEWAYS = [
  'https://ipfs-lb.com/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://dweb.link/ipfs',
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const ipfsPath = path.join('/');

  // Extract IPFS hash and file path
  // Format: /api/ipfs/{hash}/{...filePath}
  const [hash, ...filePath] = ipfsPath.split('/');
  const file = filePath.join('/');

  if (!hash || !file) {
    return NextResponse.json({ error: 'Invalid IPFS path' }, { status: 400 });
  }

  // Try each gateway
  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${hash}/${file}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'Accept': '*/*',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const data = await response.arrayBuffer();

        return new NextResponse(data, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year (artifacts don't change)
          },
        });
      }
    } catch (err) {
      console.log(`[IPFS Proxy] Gateway ${gateway} failed:`, err);
      // Try next gateway
    }
  }

  return NextResponse.json({ error: 'Could not fetch from IPFS' }, { status: 502 });
}
