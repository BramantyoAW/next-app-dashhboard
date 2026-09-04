import { notFound } from 'next/navigation';
import { getWebStoreByHashServer } from '@/lib/storefront-server';
import { FullPageMiniBar } from '@/components/storefront/FullPageMiniBar';

/**
 * Layout untuk halaman page-builder full-page (mode Stitch).
 *
 * Tema sudah disuntikkan oleh [hash]/layout.tsx. Di sini TIDAK ada
 * header/footer global — halaman adalah kanvas penuh. Satu-satunya elemen
 * chrome adalah floating mini-bar (home + akun + WhatsApp + keranjang) agar
 * checkout tetap terjangkau.
 */
export default async function FullPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const webStore = await getWebStoreByHashServer(hash);
  if (!webStore || !webStore.is_active) notFound();

  return (
    <>
      {children}
      <FullPageMiniBar hash={hash} storeName={webStore.store_name} waPhone={webStore.notify_whatsapp} />
    </>
  );
}
