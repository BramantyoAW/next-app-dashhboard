import { notFound } from 'next/navigation';
import { StorefrontHeader, StorefrontMobileSearch, StorefrontFeatureStrip } from '@/components/storefront/ui/StorefrontHeader';
import { StorefrontFooter } from '@/components/storefront/ui/StorefrontFooter';
import { getWebStoreByHashServer, getPageByHashAndSlug } from '@/lib/storefront-server';
import { normalizeChrome } from '@/lib/webTheme';
import StorefrontPuckChrome from '@/components/storefront/StorefrontPuckChrome';

/**
 * Chrome toko (mode shop): header, search, feature strip, main, footer.
 *
 * Dipakai oleh:
 *  - (shop)/layout.tsx  → semua halaman non-home (produk, kategori, cart, akun)
 *  - Home legacy di [hash]/page.tsx (home yang belum pakai page builder)
 *
 * Home full-canvas Puck TIDAK memakai shell ini — chromenya dikelola owner
 * lewat block di dalam kanvas (Shopify-like).
 *
 * Sejak Task D: bila home sudah memakai blok Puck (StoreHeader/Footer/
 * AnnouncementBar dari page builder), halaman system ikut memakai chrome blok
 * itu (konsisten + customable). Fallback ke chrome klasik hanya untuk home
 * legacy (belum di-builder).
 */
export default async function StorefrontShopShell({
  hash,
  children,
  className,
}: {
  hash: string;
  children: React.ReactNode;
  className?: string;
}) {
  const webStore = await getWebStoreByHashServer(hash);
  if (!webStore || !webStore.is_active) notFound();

  const homePage = await getPageByHashAndSlug(hash, 'home');
  const homeBlocks = homePage?.blocks ?? null;
  const puckContent = Array.isArray(homeBlocks)
    ? homeBlocks
    : (homeBlocks as any)?.puck?.content ?? [];
  const hasPuckChrome = puckContent.some((b: any) =>
    b?.type === 'StoreHeader' || b?.type === 'StoreFooter' || b?.type === 'AnnouncementBar');

  if (hasPuckChrome) {
    return <StorefrontPuckChrome hash={hash} homeBlocks={homeBlocks}>{children}</StorefrontPuckChrome>;
  }

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
        storeName={webStore.store_name || ''}
        logoUrl={webStore.logo_url}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
        chrome={chrome as any}
      />
      {chrome.header.show_search && <StorefrontMobileSearch hash={hash} brand={brand} />}
      {chrome.header.show_feature_strip && <StorefrontFeatureStrip waPhone={webStore.notify_whatsapp} />}
      <main className={`mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8 ${className ?? ''}`}>{children}</main>
      <StorefrontFooter
        hash={hash}
        storeName={webStore.store_name || ''}
        brand={brand}
        navPages={navPages.map((p) => ({ slug: p.slug, title: p.title }))}
        chrome={chrome as any}
      />
    </>
  );
}
