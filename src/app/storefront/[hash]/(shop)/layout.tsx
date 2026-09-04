import { notFound } from 'next/navigation';
import { StorefrontHeader, StorefrontMobileSearch, StorefrontFeatureStrip } from '@/components/storefront/ui/StorefrontHeader';
import { StorefrontFooter } from '@/components/storefront/ui/StorefrontFooter';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { normalizeChrome } from '@/lib/webTheme';

/**
 * Layout halaman toko (mode shop): home, produk, keranjang, checkout, akun,
 * kategori, pesanan. Header/footer global dirender penuh.
 */
export default async function ShopLayout({
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
  const settings = (webStore.settings ?? {}) as any;
  const chrome = normalizeChrome(settings.chrome ?? null);
  const navPages = (webStore.pages ?? [])
    .filter((p) => p.is_published !== false && p.slug !== 'home')
    .slice(0, 5);

  return (
    <>
      <StorefrontHeader
        hash={hash}
        storeName={webStore.store_name}
        logoUrl={webStore.logo_url}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
        chrome={chrome as any}
      />
      {chrome.header.show_search && <StorefrontMobileSearch hash={hash} brand={brand} />}
      {chrome.header.show_feature_strip && <StorefrontFeatureStrip waPhone={webStore.notify_whatsapp} />}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <StorefrontFooter
        hash={hash}
        storeName={webStore.store_name}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
        chrome={chrome as any}
      />
    </>
  );
}
