import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StorefrontHeader, StorefrontMobileSearch, StorefrontFeatureStrip } from '@/components/storefront/ui/StorefrontHeader';
import { StorefrontFooter } from '@/components/storefront/ui/StorefrontFooter';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { storefrontMetadata } from '@/lib/storefront-metadata';
import { normalizeTheme, themeToCss, sanitizeCustomJs, normalizeChrome } from '@/lib/webTheme';

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
  // Tema global (font, warna, radius, custom CSS) dari settings.theme.
  const settings = (webStore.settings ?? {}) as any;
  const theme = normalizeTheme(settings.theme ?? null);
  const chrome = normalizeChrome(settings.chrome ?? null);
  const themeCss = themeToCss(theme);
  const navPages = (webStore.pages ?? [])
    .filter((p) => p.is_published !== false && p.slug !== 'home')
    .slice(0, 5);

  return (
    <div
      style={{ ['--brand' as never]: brand } as React.CSSProperties}
      className="storefront-root flex min-h-screen flex-col overflow-x-clip bg-slate-50 text-slate-900"
    >
      {/* Tema global store: CSS vars + custom CSS owner */}
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {/* Custom JS owner — berlaku di seluruh halaman storefront (dieksekusi setelah DOM siap). */}
      {theme.custom_js && (
        <script dangerouslySetInnerHTML={{ __html: sanitizeCustomJs(theme.custom_js) }} />
      )}
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
    </div>
  );
}
