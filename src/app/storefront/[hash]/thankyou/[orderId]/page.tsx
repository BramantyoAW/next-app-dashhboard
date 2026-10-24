import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { gqlFetchServer } from '@/lib/gql-server';
import { getPageByHashAndSlug } from '@/lib/storefront-server';
import StorefrontPuckRenderer from '@/components/storefront/StorefrontPuckRenderer';
import OrderSummaryView, { type ThankYouOrder } from '@/components/storefront/OrderSummaryView';
import { isPuckStored, puckDataOf } from '@/lib/puckAdapter';

/**
 * Halaman "Terima Kasih" setelah checkout sukses — /storefront/<hash>/thankyou/<orderId>.
 *
 * Dua bagian:
 *  1. Konten blok page slug 'thankyou' (owner) — customable lewat Page Builder:
 *     hero ucapan, teks, CTA, dll. Boleh kosong → langsung summary.
 *  2. OrderSummaryView — data pesanan asli (nomor, item, total, pembayaran)
 *     DI-SUNTIK otomatis & tidak customable.
 *
 * Tanpa chrome (header/footer) — fokus konfirmasi, konsisten dgn checkout.
 */
export default async function StorefrontThankYouPage({
  params,
}: {
  params: Promise<{ hash: string; orderId: string }>;
}) {
  const { hash, orderId } = await params;

  const token = (await cookies()).get('customer_token')?.value;
  if (!token) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/thankyou/${orderId}`);

  const data = await gqlFetchServer<{ getOrderById: ThankYouOrder | null }>({
    query: `query($id: ID!) {
      getOrderById(id: $id) {
        id order_number status total_amount created_at discount shipping_cost
        shipping_address tracking_number
        additional_data
        items { id store_id name qty price subtotal store { id name } }
      }
    }`,
    variables: { id: orderId },
    token,
  });
  const o = data?.getOrderById;
  if (!o) notFound();

  // Konten blok halaman thankyou milik owner (opsional)
  const tpl = await getPageByHashAndSlug(hash, 'thankyou');
  let puck = null;
  if (tpl && isPuckStored(tpl.blocks)) {
    const p = puckDataOf(tpl.blocks);
    if (p && (p.content ?? []).length > 0) puck = p;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-10 sm:py-14">
      {puck ? (
        <div className="w-full">
          <StorefrontPuckRenderer data={puck} dynamic={{ hash }} />
        </div>
      ) : (
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: 'var(--accent, #c5a880)', color: 'var(--text, #161616)' }}
          >
            ✓
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}>
            Terima Kasih!
          </h1>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            Pesanan Anda sudah kami terima dan sedang diproses. Detail pesanan ada di bawah.
          </p>
        </div>
      )}

      {/* Data order — fixed, tidak customable */}
      <OrderSummaryView hash={hash} o={o} />
    </div>
  );
}
