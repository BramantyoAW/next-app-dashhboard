export async function gqlFetch<T>(
    query: string,
    variables: Record<string, any> = {},
    token?: string
  ): Promise<T> {
    // Pastikan URL publik ada. Kalau undefined/empty, fetch akan ke Next dev server → balas HTML.
    const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
    if (!endpoint) {
      throw new Error(
        'NEXT_PUBLIC_GRAPHQL_URL is empty. Set it in .env.local, e.g. NEXT_PUBLIC_GRAPHQL_URL=http://127.0.0.1:8000/graphql'
      );
    }
  
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });
  
    // Ambil raw text dulu agar bisa diagnosa kalau bukan JSON
    const raw = await res.text();
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');
  
    if (!isJson) {
      // Biasanya ini HTML dari Next (URL salah), 419 CSRF page, atau error page lainnya.
      throw new Error(
        `Non-JSON response from GraphQL (${res.status} ${res.statusText}). ` +
        `First 200 chars: ${raw.slice(0, 200)}`
      );
    }
  
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      // “Unexpected token '<'” biasanya terjadi di sini. Kita lempar error yang lebih informatif.
      throw new Error(
        `Failed to parse JSON from GraphQL (${res.status}). First 200 chars: ${raw.slice(0, 200)}`
      );
    }
  
    if (json.errors?.length) {
      const msg = json.errors.map((e: any) => e.message).join(', ');
      throw new Error(msg || 'GraphQL error');
    }
  
    return json.data as T;
  }
  