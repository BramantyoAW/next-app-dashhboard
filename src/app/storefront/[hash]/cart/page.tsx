import { CartView } from '@/components/storefront/CartView';
import StorefrontPuckRenderer from '@/components/storefront/StorefrontPuckRenderer';
import StorefrontShopShell from '@/components/storefront/StorefrontShopShell';
import { isPuckStored, puckDataOf } from '@/lib/puckAdapter';
import { getPageByHashAndSlug } from '@/lib/storefront-server';

/**
 * Halaman keranjang. Jika owner membuat halaman kanvas slug 'cart' (berisi
 * blok Slot Keranjang + konten statis), halaman dirender sebagai kanvas.
 * Jika belum → CartView default dibungkus chrome toko.
 */
export default async function StorefrontCartPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { hash } = await params;
  const { checkout } = await searchParams;

  const tpl = await getPageByHashAndSlug(hash, 'cart');
  if (tpl && isPuckStored(tpl.blocks)) {
    const puck = puckDataOf(tpl.blocks);
    if (puck && (puck.content ?? []).length > 0) {
      return <StorefrontPuckRenderer data={puck} dynamic={{ hash }} />;
    }
  }

  return (
    <StorefrontShopShell hash={hash}>
      <CartView hash={hash} jumpToCheckout={checkout === '1'} />
    </StorefrontShopShell>
  );
}
