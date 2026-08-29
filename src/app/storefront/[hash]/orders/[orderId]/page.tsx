import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';

type Item = { id: string; name: string | null; qty: number; price: number; subtotal: number };
type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  discount: number | null;
  shipping_address: string | null;
  additional_data: {
    payment_method?: {
      name?: string | null;
      bank_name?: string | null;
      account_number?: string | null;
      account_name?: string | null;
      instructions?: string | null;
    } | null;
    shipping?: Record<string, unknown> | null;
  } | null;
  items: Item[];
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  paid: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

export default async function StorefrontOrderDetailPage({
  params,
}: {
  params: Promise<{ hash: string; orderId: string }>;
}) {
  const { hash, orderId } = await params;
  const cookieStore = await cookies(); const token = cookieStore.get('customer_token')?.value;
  const data = await gqlFetchServer<{ getOrderById: Order | null }>({
    query: `query($id: ID!) {
      getOrderById(id: $id) {
        id order_number status total_amount created_at discount
        shipping_address
        additional_data
        items { id name qty price subtotal }
      }
    }`,
    variables: { id: orderId },
    token,
  });
  const o = data?.getOrderById;
  if (!o) notFound();

  const pm = o.additional_data?.payment_method;
  const statusLabel = STATUS_LABEL[o.status] ?? o.status;
  const statusStyle = STATUS_STYLE[o.status] ?? 'bg-neutral-100 text-neutral-600';

  return (
    <div>
      <nav className="mb-2 text-xs text-neutral-500">
        <Link href={`/storefront/${hash}/orders`} className="hover:underline">Pesanan</Link>
        <span className="mx-1">/</span>
        <span>{o.order_number}</span>
      </nav>
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">{o.order_number}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          {new Date(o.created_at).toLocaleString('id-ID')}
        </div>

        {o.status === 'pending_payment' && pm && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-semibold text-amber-800">Instruksi Pembayaran</div>
            <div className="mt-1 text-amber-800">
              Transfer sebesar <b>{formatIDR(o.total_amount)}</b>
            </div>
            {pm.bank_name && <div className="mt-1 text-amber-800">Bank: {pm.bank_name}</div>}
            {pm.account_number && (
              <div className="text-amber-800">
                No. Rekening: <b>{pm.account_number}</b>
                {pm.account_name ? ` a.n. ${pm.account_name}` : ''}
              </div>
            )}
            {pm.instructions && <div className="mt-1 text-xs text-amber-700">{pm.instructions}</div>}
            <div className="mt-1 text-xs text-amber-700">
              Setelah transfer, konfirmasi pembayaran Anda ke penjual.
            </div>
          </div>
        )}

        {o.shipping_address && (
          <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Alamat Kirim</div>
            <div className="mt-1">{o.shipping_address}</div>
          </div>
        )}

        <ul className="mt-4 divide-y">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2 text-sm">
              <span className="pr-2">{i.name} × {i.qty}</span>
              <span>{formatIDR(i.subtotal)}</span>
            </li>
          ))}
        </ul>

        {o.discount ? (
          <div className="mt-3 flex justify-between text-sm text-neutral-600">
            <span>Diskon</span>
            <span>-{formatIDR(o.discount)}</span>
          </div>
        ) : null}

        <div className="mt-3 flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatIDR(o.total_amount)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/storefront/${hash}`}
            className="rounded-lg border px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Kembali Belanja
          </Link>
          <Link
            href={`/storefront/${hash}/orders`}
            className="rounded-lg border px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Semua Pesanan
          </Link>
        </div>
      </div>
    </div>
  );
}
