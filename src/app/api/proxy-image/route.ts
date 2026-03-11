import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.GRAPHQL_URL?.replace('/graphql', '') || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow proxying images from our backend
  const allowedOrigins = [
    BACKEND_BASE,
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://nginx-server:80',
    process.env.GRAPHQL_URL?.replace('/graphql', ''),
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(origin => imageUrl.startsWith(origin!));
  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      // If image is missing (403/404), redirect to default placeholder
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
