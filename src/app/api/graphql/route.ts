import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';
  
  try {
    const contentType = request.headers.get('content-type') || '';

    // Build headers to forward to backend
    const forwardHeaders: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader;
    }

    let body: any;

    if (contentType.includes('multipart/form-data')) {
      // File upload: forward the FormData as-is
      const formData = await request.formData();
      body = formData;
      // Don't set Content-Type for FormData — fetch will auto-set it with the correct boundary
    } else {
      // Regular JSON GraphQL request
      forwardHeaders['Content-Type'] = 'application/json';
      body = await request.text();
    }

    console.log(`[GraphQL Proxy] Forwarding to: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body,
    });

    const responseText = await backendResponse.text();
    const responseContentType = backendResponse.headers.get('content-type') || 'application/json';

    console.log(`[GraphQL Proxy] Backend responded: ${backendResponse.status}`);

    return new NextResponse(responseText, {
      status: backendResponse.status,
      headers: {
        'Content-Type': responseContentType,
      },
    });
  } catch (error: any) {
    console.error(`[GraphQL Proxy Error] Backend URL: ${backendUrl}`, error);
    return NextResponse.json(
      { errors: [{ message: `Proxy error: ${error.message}` }] },
      { status: 502 }
    );
  }
}
