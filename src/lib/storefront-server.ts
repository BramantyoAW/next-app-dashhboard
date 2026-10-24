import 'server-only';

export type WebStoreResolved = {
  id: string;
  owner_id: string | null;
  store_id: string;
  slug: string | null;
  subdomain_hash: string | null;
  store_name: string;
  theme_color: string | null;
  tagline: string | null;
  is_active: boolean;
  logo_url: string | null;
  banner_url: string | null;
  notify_whatsapp: string | null;
  settings?: Record<string, unknown> | null;
  pages?: { id: string; slug: string; title: string; is_published: boolean }[];
};

/**
 * Ambil blok home (slug 'home') utk deteksi format: legacy array vs puck JSON.
 * Query kecil terpisah supaya layout lain tak memuat semua blok tiap halaman.
 */
export async function getHomeBlocksByHash(hash: string): Promise<unknown | null> {
  if (!hash) return null;
  const apiUrl = process.env.GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';
  const query = `query($hash: String!) {
    webStoreByHash(hash: $hash) {
      pages { slug blocks }
    }
  }`;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { hash } }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const home = json?.data?.webStoreByHash?.pages?.find((p: { slug: string }) => p.slug === 'home');
    return home?.blocks ?? null;
  } catch {
    return null;
  }
}


/**
 * Resolve a WebStore by subdomain hash via the GraphQL gateway.
 * Uses the real `webStoreByHash` field from the commerce schema.
 */
export async function getWebStoreByHashServer(hash: string): Promise<WebStoreResolved | null> {
  if (!hash) return null;
  // Server-side fetch needs an absolute URL; NEXT_PUBLIC_GRAPHQL_URL is the
  // relative browser proxy path and fails in server components.
  const apiUrl = process.env.GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';
  const query = `query($hash: String!) {
    webStoreByHash(hash: $hash) {
      id owner_id store_id slug subdomain_hash
      store_name theme_color tagline is_active logo_url banner_url notify_whatsapp settings
      pages { id slug title is_published }
    }
  }`;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { hash } }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const ws = json?.data?.webStoreByHash;
    if (!ws) return null;
    return {
      id: ws.id,
      owner_id: ws.owner_id,
      store_id: ws.store_id,
      slug: ws.slug,
      subdomain_hash: ws.subdomain_hash,
      store_name: ws.store_name,
      theme_color: ws.theme_color,
      tagline: ws.tagline,
      is_active: ws.is_active,
      logo_url: ws.logo_url ?? null,
      banner_url: ws.banner_url ?? null,
      notify_whatsapp: ws.notify_whatsapp ?? null,
      settings: ws.settings ?? null,
      pages: ws.pages ?? [],
    };
  } catch {
    return null;
  }
}

/** Ambil satu halaman web store (slug tertentu) — utk template dinamis (product, cart, dsb). */
export async function getPageByHashAndSlug(hash: string, slug: string): Promise<{ title: string; blocks: unknown } | null> {
  if (!hash || !slug) return null;
  const apiUrl = process.env.GRAPHQL_URL || 'http://127.0.0.1:8000/graphql';
  const query = `query($hash: String!) {
    webStoreByHash(hash: $hash) { pages { slug title blocks } }
  }`;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { hash } }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const page = json?.data?.webStoreByHash?.pages?.find((p: { slug: string }) => p.slug === slug);
    return page ? { title: page.title ?? '', blocks: page.blocks ?? null } : null;
  } catch {
    return null;
  }
}
