export async function gqlFetch<T>(
  query: string,
  variables: Record<string, any> = {},
  token?: string
): Promise<T> {
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (!endpoint) {
    throw new Error(
      'NEXT_PUBLIC_GRAPHQL_URL is empty. Set it in .env.local'
    );
  }

  const hasFiles = Object.values(variables).some(
    (v) => v instanceof File || v instanceof Blob
  );

  let body: any;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (hasFiles) {
    const formData = new FormData();
    const operations = { query, variables: { ...variables } };
    const map: Record<string, string[]> = {};
    
    // Deteksi file dan pindahkan ke form-data root sesuai spec
    Object.keys(variables).forEach((key) => {
      if (variables[key] instanceof File || variables[key] instanceof Blob) {
        operations.variables[key] = null;
        map[key] = [`variables.${key}`];
      }
    });

    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify(map));
    
    Object.keys(map).forEach((key) => {
      formData.append(key, variables[key]);
    });

    body = formData;
    // Berbeda dengan JSON, fetch akan otomatis set Content-Type: multipart/form-data dengan boundary yang benar
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ query, variables });
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });

  const raw = await res.text();
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  
  if (!contentType.includes('application/json')) {
    throw new Error(`Non-JSON response from GraphQL (${res.status}). ${raw.slice(0, 200)}`);
  }

  const json = JSON.parse(raw);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join(', '));
  }

  return json.data as T;
}