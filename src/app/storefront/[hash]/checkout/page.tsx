import { CheckoutForm } from '@/components/storefront/CheckoutForm';
import StorefrontPuckRenderer from '@/components/storefront/StorefrontPuckRenderer';
import StorefrontShopShell from '@/components/storefront/StorefrontShopShell';
import { isPuckStored, puckDataOf } from '@/lib/puckAdapter';
import { getPageByHashAndSlug } from '@/lib/storefront-server';

/**
 * Halaman checkout. Jika owner membuat halaman kanvas slug 'checkout' (berisi
 * blok Slot Checkout + konten statis), halaman dirender sebagai kanvas.
 * Jika belum → CheckoutForm default dibungkus chrome toko.
 */
export default async function StorefrontCheckoutPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  const tpl = await getPageByHashAndSlug(hash, 'checkout');
  if (tpl && isPuckStored(tpl.blocks)) {
    const puck = puckDataOf(tpl.blocks);
    if (puck && (puck.content ?? []).length > 0) {
      return <StorefrontPuckRenderer data={puck} dynamic={{ hash }} />;
    }
  }

  return (
    <StorefrontShopShell hash={hash}>
      <CheckoutForm hash={hash} />
    </StorefrontShopShell>
  );
}
