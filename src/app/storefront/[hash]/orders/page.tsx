import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';

type Item = { id: string; name: string | null; qty: number; price: number; subtotal: number };
type Order = { id: string; order_number: string; status: string; total_amount: number; created_at: string; items: Item[] };

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default async function StorefrontOrdersPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('customer_token')?.value;
  if (!token) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account`);
  const data = await gqlFetchServer<{ customerMe: { orders: Order[] } | null }>({
    query: `query {
      customerMe {
        orders { id order_number status total_amount created_at items { id name qty price subtotal } }
      }
    }`,
    token,
  });
  const orders = data?.customerMe?.orders ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pesanan Saya</h1>
      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <p className="text-sm text-slate-500">Belum ada pesanan.</p>
          <Link href={`/storefront/${hash}`} className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">
            Mulai belanja
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800">{o.order_number}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleString('id-ID')} • {o.items.length} item •{' '}
                  <span className="font-semibold text-slate-600">{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-slate-900">{formatIDR(o.total_amount)}</div>
                <Link href={`/storefront/${hash}/orders/${o.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                  Detail →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
