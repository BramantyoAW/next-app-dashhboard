import StorefrontShopShell from '@/components/storefront/StorefrontShopShell';

/**
 * Layout halaman toko (mode shop) untuk halaman NON-home: produk, keranjang,
 * checkout, akun, kategori, pesanan. Semua dibungkus chrome toko.
 *
 * Home (route root /storefront/<hash>) tidak berada di group ini — ia route
 * sendiri ([hash]/page.tsx) supaya bisa full-canvas penuh saat data Puck
 * (page builder) tanpa chrome dobel.
 */
export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  return <StorefrontShopShell hash={hash}>{children}</StorefrontShopShell>;
}
