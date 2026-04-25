import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.GRAPHQL_URL?.replace('/graphql', '') || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const publicOrigins = [
    'https://services.om-bot.com',
    'http://services.om-bot.com',
  ];

  const allowedOrigins = [
    BACKEND_BASE,
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://nginx-server:80',
    ...publicOrigins,
    process.env.GRAPHQL_URL?.replace('/graphql', ''),
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(origin => imageUrl.startsWith(origin!));
  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  // Internal fetch optimization: bypass Cloudflare Access by fetching from container
  let fetchUrl = imageUrl;
  let hostHeader = '';
  for (const pub of publicOrigins) {
    if (fetchUrl.startsWith(pub)) {
      fetchUrl = fetchUrl.replace(pub, BACKEND_BASE);
      hostHeader = pub.replace(/^https?:\/\//, ''); // e.g. services.om-bot.com
      break;
    }
  }

  // Handle local development/Docker internal IPs
  if (fetchUrl.startsWith('http://127.0.0.1:8000') || fetchUrl.startsWith('http://localhost:8000')) {
    fetchUrl = fetchUrl.replace('http://127.0.0.1:8000', BACKEND_BASE).replace('http://localhost:8000', BACKEND_BASE);
  }

  // Cloudflare Access Headers (if provided in ENV)
  const cfId = process.env.CF_ACCESS_CLIENT_ID;
  const cfSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  try {
    const headers: Record<string, string> = {};
    if (hostHeader) headers['Host'] = hostHeader;
    if (cfId) headers['CF-Access-Client-Id'] = cfId;
    if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;

    const response = await fetch(fetchUrl, { headers });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        return NextResponse.redirect(new URL('/default-product.svg', request.url));
      }
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[Image Proxy Error]', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
