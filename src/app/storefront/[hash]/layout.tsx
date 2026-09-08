import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { storefrontMetadata } from '@/lib/storefront-metadata';
import { normalizeTheme, themeToCss, sanitizeCustomJs } from '@/lib/webTheme';
import { CartDrawerProvider } from '@/components/storefront/CartDrawer';

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
 * Layout dasar storefront — menyuntikkan tema (CSS vars, custom CSS/JS),
 * wrapper root, dan provider drawer keranjang global.
 *
 * Chrome (header/footer) customable per halaman:
 *   - Halaman Puck (home, about, dll) → blok StoreHeader/StoreFooter/AnnouncementBar
 *     di dalam kanvas, dimiliki owner. Ikon Akun + keranjang di blok header
 *     bersifat tetap (tidak bisa dihapus owner).
 *   - Halaman sistem ((shop)) → chrome via StorefrontShopShell.
 *   - Checkout & halaman order detail (thankyou) → tanpa chrome.
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

  const settings = (webStore.settings ?? {}) as any;
  const theme = normalizeTheme(settings.theme ?? null);
  // Satu sumber warna: settings.theme.colors.brand lebih baru & otoritatif;
  // theme_color (kolom legacy) hanya fallback bila theme belum pernah disimpan.
  const brand = theme.colors.brand || webStore.theme_color || '#111111';
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
      {/* Drawer keranjang global — ikon cart mana pun membuka tray geser ini */}
      <CartDrawerProvider hash={hash}>{children}</CartDrawerProvider>
    </div>
  );
}
