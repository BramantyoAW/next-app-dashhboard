import Link from 'next/link';
import { cookies } from 'next/headers';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';

type Item = { id: string; name: string | null; qty: number; price: number; subtotal: number };
type Order = { id: string; order_number: string; status: string; total_amount: number; created_at: string; items: Item[] };

export default async function StorefrontOrdersPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const cookieStore = await cookies(); const token = cookieStore.get('customer_token')?.value;
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
    <div>
      <h1 className="mb-4 text-xl font-semibold">Pesanan Saya</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
          Belum ada pesanan.
          <div className="mt-3">
            <Link href={`/storefront/${hash}`} className="underline">Mulai belanja</Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{o.order_number}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(o.created_at).toLocaleString('id-ID')} • {o.items.length} item • {o.status}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatIDR(o.total_amount)}</div>
                <Link
                  href={`/storefront/${hash}/orders/${o.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
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
