import { notFound } from 'next/navigation';
import { getWebStoreByHashServer } from '@/lib/storefront-server';

/**
 * Layout halaman page-builder full-page (mode Stitch).
 *
 * Tema + provider drawer keranjang disuntikkan [hash]/layout.tsx.
 * Chrome header/footer adalah blok kanvas milik owner
 * (StoreHeader/AnnouncementBar/StoreFooter) — jadi tidak ada chrome
 * global di sini. Checkout & order detail (thankyou) tak punya header.
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

  return <>{children}</>;
}
