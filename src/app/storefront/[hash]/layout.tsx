import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { StorefrontCartBadge } from '@/components/storefront/StorefrontCartBadge';
import { StorefrontAuthButton } from '@/components/storefront/StorefrontAuthButton';

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const webStore = await getWebStoreByHashServer(hash);
  if (!webStore || !webStore.is_active) notFound();

  const brand = webStore.theme_color || '#111111';
  // Dynamic pages for navigation (skip home — it's the root link).
  const navPages = (webStore.pages ?? [])
    .filter((p) => p.is_published !== false && p.slug !== 'home')
    .slice(0, 5);

  return (
    <div style={{ ['--brand' as never]: brand } as React.CSSProperties} className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href={`/storefront/${hash}`} className="flex items-center gap-2">
            {webStore.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={webStore.logo_url} alt={webStore.store_name} className="h-7" />
            ) : (
              <span className="h-7 w-7 rounded-full" style={{ background: brand }} />
            )}
            <span className="font-semibold" style={{ color: brand }}>
              {webStore.store_name}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm text-neutral-600">
            {navPages.map((p) => (
              <Link
                key={p.id}
                href={`/storefront/${hash}/${p.slug}`}
                className="rounded-lg px-2.5 py-1.5 font-medium hover:bg-neutral-100 hover:text-neutral-900"
              >
                {p.title}
              </Link>
            ))}
          </nav>
          <form action={`/storefront/${hash}`} method="get" className="ml-auto flex-1 max-w-md">
            <input
              type="search"
              name="q"
              placeholder="Cari produk…"
              className="w-full rounded-lg border bg-neutral-50 px-3 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2"
              style={{ ['--ring' as never]: brand } as React.CSSProperties}
            />
          </form>
          <Link
            href={`/storefront/${hash}/orders`}
            className="hidden sm:inline-block text-sm text-neutral-700 hover:underline"
          >
            Pesanan
          </Link>
          <StorefrontCartBadge hash={hash} />
          <StorefrontAuthButton hash={hash} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto mt-16 max-w-6xl border-t px-4 py-6 text-xs text-neutral-500">
        <div className="flex justify-between">
          <span>© {new Date().getFullYear()} {webStore.store_name}</span>
          <span>
            Powered by{' '}
            <a href="https://om-bot.com" className="underline">
              om-bot.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
