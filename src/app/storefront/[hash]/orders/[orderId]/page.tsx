import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';

type Item = { id: string; store_id?: string | null; name: string | null; qty: number; price: number; subtotal: number; store?: { id: string; name: string } | null };
type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  discount: number | null;
  shipping_cost: number | null;
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
  const cookieStore = await cookies();
  const token = cookieStore.get('customer_token')?.value;
  const data = await gqlFetchServer<{ getOrderById: Order | null }>({
    query: `query($id: ID!) {
      getOrderById(id: $id) {
        id order_number status total_amount created_at discount shipping_cost
        shipping_address
        additional_data
        items { id store_id name qty price subtotal store { id name } }
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
    <div className="mx-auto max-w-3xl">
      <nav className="mb-2 flex items-center gap-1 text-xs text-slate-400">
        <Link href={`/storefront/${hash}/orders`} className="hover:underline">
          Pesanan
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-600">{o.order_number}</span>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{o.order_number}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>{statusLabel}</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">{new Date(o.created_at).toLocaleString('id-ID')}</div>

        {o.status === 'pending_payment' && pm && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <div className="font-bold text-amber-800">Instruksi Pembayaran</div>
            <div className="mt-1.5 font-semibold text-amber-900">
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
            <div className="mt-1 text-xs text-amber-700">Setelah transfer, konfirmasi pembayaran Anda ke penjual.</div>
          </div>
        )}

        {o.shipping_address && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Alamat Kirim</div>
            <div className="mt-1">{o.shipping_address}</div>
          </div>
        )}

        <ul className="mt-5 divide-y divide-slate-100">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2.5 text-sm">
              <span className="pr-2 font-medium text-slate-700">
                {i.name} × {i.qty}
                {i.store && (
                  <span className="ml-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {i.store.name}
                  </span>
                )}
              </span>
              <span className="font-semibold text-slate-800">{formatIDR(i.subtotal)}</span>
            </li>
          ))}
        </ul>

        {o.discount ? (
          <div className="mt-2 flex justify-between text-sm text-slate-500">
            <span>Diskon</span>
            <span className="font-semibold text-emerald-600">-{formatIDR(o.discount)}</span>
          </div>
        ) : null}
        {o.shipping_cost ? (
          <div className="mt-1 flex justify-between text-sm text-slate-500">
            <span>Ongkir</span>
            <span className="font-semibold text-slate-700">{formatIDR(o.shipping_cost)}</span>
          </div>
        ) : null}

        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
          <span>Total</span>
          <span>{formatIDR(o.total_amount)}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/storefront/${hash}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Kembali Belanja
          </Link>
          <Link href={`/storefront/${hash}/orders`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Semua Pesanan
          </Link>
        </div>
      </div>
    </div>
  );
}
