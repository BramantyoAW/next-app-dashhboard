import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'om-bot.com';

/** Resolve domain merchant (custom domain) → subdomain_hash lewat backend. */
async function resolveStoreHashByHost(host: string): Promise<string | null> {
  const apiUrl = process.env.GRAPHQL_URL || 'http://laravel:8000/graphql';
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($host: String!) { webStoreByHost(host: $host) { subdomain_hash } }`,
        variables: { host },
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.webStoreByHost?.subdomain_hash ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host') || '';
  const hostname = hostHeader.split(':')[0];
  const pathname = request.nextUrl.pathname;

  // HTTP DCV: Cloudflare bisa meminta token ACME langsung ke origin. Jangan
  // di-rewrite ke storefront dan jangan kena 404 host-asing — token harus
  // dilayani apa adanya, kalau tidak sertifikat tidak pernah terbit.
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  const isMain =
    hostname === MAIN_DOMAIN ||
    hostname === `www.${MAIN_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname.startsWith('localhost:');

  // Subdomain → storefront rewrite.
  // Production: <store>.<MAIN_DOMAIN> (e.g. teststor.om-bot.com)
  // Dev:        <store>.lvh.me (lvh.me resolves every subdomain to 127.0.0.1)
  let storeHash: string | null = null;
  if (hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    storeHash = hostname.replace(`.${MAIN_DOMAIN}`, '');
  } else if (hostname.endsWith('.lvh.me')) {
    storeHash = hostname.replace('.lvh.me', '');
  } else if (!isMain) {
    // Host asing = custom domain merchant. Hanya dilayani kalau terdaftar di
    // web_stores; selain itu 404 (cegah domain fronting lewat tunnel ini).
    storeHash = await resolveStoreHashByHost(hostname);
    if (!storeHash) return new NextResponse(null, { status: 404 });
  }

  if (storeHash) {
    // Idempotent: if the path already targets this storefront (either the
    // root `/` or an explicit `/storefront/<same-hash>/...`), don't prefix
    // again — otherwise we'd get `storefront/h/storefront/h/cart` → 404.
    const alreadyStorefront = pathname === '/'
      ? false
      : pathname.startsWith('/storefront/')
        ? pathname === `/storefront/${storeHash}` || pathname.startsWith(`/storefront/${storeHash}/`)
        : false;

    if (alreadyStorefront) {
      const resp = NextResponse.next();
      resp.headers.set('x-store-hash', storeHash);
      return resp;
    }

    const url = request.nextUrl.clone();
    url.pathname = `/storefront/${storeHash}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-store-hash', storeHash);
    return response;
  }

  // Dashboard auth guard
  const isProtectedDashboard =
    pathname.startsWith('/owner') || pathname.startsWith('/dashboard');
  if (isProtectedDashboard) {
    const token = request.cookies.get('ombot_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Jangan rewrite aset statis (public/*): gambar, font, dll. Kalau tidak,
  // request /atlas/img-01.png di subdomain toko ikut di-prefix
  // /storefront/<hash>/atlas/... → 404 (gambar produk & placeholder rusak).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)'],
};
