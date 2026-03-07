export async function gqlFetch<T>(
  query: string,
  variables: Record<string, any> = {},
  token?: string
): Promise<T> {
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();
  if (!endpoint) {
    throw new Error('NEXT_PUBLIC_GRAPHQL_URL is empty.');
  }

  // Recursive helper to find all files and their paths
  const files: { file: File | Blob; path: string }[] = [];
  const findFiles = (obj: any, path: string) => {
    if (!obj) return;
    if (obj instanceof File || obj instanceof Blob) {
      files.push({ file: obj, path });
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => findFiles(item, `${path}.${i}`));
    } else if (typeof obj === 'object') {
      Object.keys(obj).forEach((key) => findFiles(obj[key], `${path}.${key}`));
    }
  };
  findFiles(variables, 'variables');

  let body: any;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (files.length > 0) {
    const formData = new FormData();
    // Clone variables to modify them for operations string
    const variablesClone = JSON.parse(JSON.stringify(variables, (key, value) => {
      if (value instanceof File || value instanceof Blob) return null;
      return value;
    }));

    const operations = { query, variables: variablesClone };
    const map: Record<string, string[]> = {};
    
    files.forEach((item, index) => {
      const key = index.toString();
      map[key] = [item.path];
      formData.append(key, item.file);
    });

    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify(map));
    body = formData;
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
    throw new Error(`Non-JSON (${res.status}). ${raw.slice(0, 100)}`);
  }

  const json = JSON.parse(raw);
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join(', '));
  }

  return json.data as T;
}