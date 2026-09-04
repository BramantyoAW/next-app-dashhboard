import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { storefrontMetadata } from '@/lib/storefront-metadata';
import { normalizeTheme, themeToCss, sanitizeCustomJs } from '@/lib/webTheme';

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

/**
 * Layout dasar storefront — hanya menyuntikkan tema (CSS vars, custom CSS/JS)
 * dan wrapper root. Chrome (header/footer penuh ATAU floating mini-bar)
 * dirender oleh layout route group anak:
 *   - (shop)     → halaman toko: header/footer penuh
 *   - (fullpage) → halaman page-builder: tanpa navbar (mode Stitch)
 */
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
  const settings = (webStore.settings ?? {}) as any;
  const theme = normalizeTheme(settings.theme ?? null);
  const themeCss = themeToCss(theme);

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
      {children}
    </div>
  );
}
