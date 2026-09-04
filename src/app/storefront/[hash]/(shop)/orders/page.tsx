import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { CustomerAccountShell, type AccountCustomer } from '@/components/storefront/CustomerAccountShell';

type Order = { id: string; order_number: string; status: string; total_amount: number; created_at: string; items: { id: string; name: string | null; qty: number; price: number; subtotal: number }[] };
const LABEL: Record<string, string> = { pending_payment: 'Menunggu Pembayaran', paid: 'Dibayar', processing: 'Diproses', shipped: 'Dikirim', completed: 'Selesai', cancelled: 'Dibatalkan' };
const STYLE: Record<string, string> = { pending_payment: 'bg-amber-100 text-amber-700', paid: 'bg-sky-100 text-sky-700', processing: 'bg-violet-100 text-violet-700', shipped: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-rose-100 text-rose-700' };
export default async function StorefrontOrdersPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params; const token = (await cookies()).get('customer_token')?.value; if (!token) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/orders`);
  const data = await gqlFetchServer<{ customerMe: (AccountCustomer & { orders: Order[] }) | null }>({ query: `query { customerMe { id name email phone created_at addresses { id label recipient phone address_line city province postal_code is_default } orders { id order_number status total_amount created_at items { id name qty price subtotal } } } }`, token }); if (!data?.customerMe) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/orders`); const c = data.customerMe;
  return <CustomerAccountShell hash={hash} customer={c} active="orders" title="Pesanan Saya" description="Riwayat pembelian dan status pesanan Anda."><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{c.orders.length ? <div className="space-y-3">{c.orders.map(o => <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><div className="font-bold text-slate-800">{o.order_number}</div><div className="mt-1 text-xs text-slate-500">{new Date(o.created_at).toLocaleString('id-ID')} · {o.items.length} item</div></div><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}>{LABEL[o.status] || o.status}</span><div className="mt-2 font-extrabold">{formatIDR(o.total_amount)}</div><Link href={`/storefront/${hash}/orders/${o.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Lihat detail →</Link></div></div>)}</div> : <p className="text-sm text-slate-500">Belum ada pesanan.</p>}</div></CustomerAccountShell>;
}
