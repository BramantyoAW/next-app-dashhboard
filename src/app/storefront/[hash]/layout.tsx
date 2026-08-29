import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StorefrontHeader, StorefrontMobileSearch, StorefrontFeatureStrip } from '@/components/storefront/ui/StorefrontHeader';
import { StorefrontFooter } from '@/components/storefront/ui/StorefrontFooter';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { storefrontMetadata } from '@/lib/storefront-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  const ws = await getWebStoreByHashServer(hash);
  if (!ws || !ws.is_active) return { title: 'Toko tidak ditemukan' };
  return storefrontMetadata(ws);
}

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
  const navPages = (webStore.pages ?? [])
    .filter((p) => p.is_published !== false && p.slug !== 'home')
    .slice(0, 5);

  return (
    <div
      style={{ ['--brand' as never]: brand } as React.CSSProperties}
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
    >
      <StorefrontHeader
        hash={hash}
        storeName={webStore.store_name}
        logoUrl={webStore.logo_url}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
      />
      <StorefrontMobileSearch hash={hash} brand={brand} />
      <StorefrontFeatureStrip waPhone={webStore.notify_whatsapp} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <StorefrontFooter
        hash={hash}
        storeName={webStore.store_name}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
      />
    </div>
  );
}
