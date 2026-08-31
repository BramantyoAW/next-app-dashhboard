import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { CustomerLogoutButton } from '@/components/storefront/CustomerLogoutButton';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu Pembayaran', paid: 'Dibayar', processing: 'Diproses', shipped: 'Dikirim', completed: 'Selesai', cancelled: 'Dibatalkan',
};
const STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700', paid: 'bg-sky-100 text-sky-700', processing: 'bg-violet-100 text-violet-700', shipped: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-rose-100 text-rose-700',
};

type Customer = { id: string; name: string; email: string; phone?: string | null; created_at: string; addresses: { id: string; label?: string | null; recipient: string; phone: string; address_line: string; city?: string | null; province?: string | null; postal_code?: string | null; is_default: boolean }[]; orders: { id: string; order_number: string; status: string; total_amount: number; created_at: string; items: { id: string; name: string | null; qty: number; price: number; subtotal: number }[] }[] };

export default async function CustomerAccountPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const token = (await cookies()).get('customer_token')?.value;
  if (!token) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account`);
  const data = await gqlFetchServer<{ customerMe: Customer | null }>({ query: `query { customerMe { id name email phone created_at addresses { id label recipient phone address_line city province postal_code is_default } orders { id order_number status total_amount created_at items { id name qty price subtotal } } } }`, token });
  const customer = data?.customerMe;
  if (!customer) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account`);

  return <div className="mx-auto max-w-6xl px-1 py-2">
    <div className="mb-7 border-b border-slate-200 pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Akun Saya</h1><p className="mt-1 text-sm text-slate-500">Kelola informasi akun dan lihat pesanan Anda.</p></div>
    <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="border-b border-slate-100 px-3 pb-3"><div className="text-xs uppercase tracking-wider text-slate-400">Halo,</div><div className="font-bold text-slate-900">{customer.name}</div></div><nav className="space-y-1 pt-3"><Link href={`/storefront/${hash}/account`} className="block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Dashboard Akun</Link><a href="#informasi-akun" className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Informasi Akun</a><a href="#address-book" className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Address Book</a><a href="#pesanan" className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Pesanan Saya</a><Link href={`/storefront/${hash}`} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Lanjut Belanja</Link><CustomerLogoutButton hash={hash} /></nav></aside>
      <main className="space-y-7">
        <section id="informasi-akun" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Informasi Akun</h2><span className="text-xs text-slate-400">Member sejak {new Date(customer.created_at).toLocaleDateString('id-ID')}</span></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-semibold uppercase text-slate-400">Nama</div><div className="mt-1 font-semibold text-slate-800">{customer.name}</div></div><div><div className="text-xs font-semibold uppercase text-slate-400">Email</div><div className="mt-1 font-semibold text-slate-800">{customer.email}</div></div><div><div className="text-xs font-semibold uppercase text-slate-400">Nomor HP</div><div className="mt-1 font-semibold text-slate-800">{customer.phone || 'Belum diisi'}</div></div></div></section>
        <section id="address-book" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold text-slate-900">Address Book</h2>{customer.addresses.length ? <div className="grid gap-3 sm:grid-cols-2">{customer.addresses.map(a => <div key={a.id} className="rounded-xl border border-slate-200 p-4 text-sm"><div className="font-bold">{a.label || 'Alamat'} {a.is_default && <span className="ml-1 text-xs text-emerald-600">Utama</span>}</div><div className="mt-1 text-slate-600">{a.recipient} · {a.phone}<br />{a.address_line}{a.city ? `, ${a.city}` : ''}{a.province ? `, ${a.province}` : ''} {a.postal_code || ''}</div></div>)}</div> : <p className="text-sm text-slate-500">Belum ada alamat tersimpan.</p>}</section>
        <section id="pesanan" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Pesanan Saya</h2><Link href={`/storefront/${hash}/orders`} className="text-sm font-bold text-blue-600 hover:underline">Lihat semua</Link></div>{customer.orders.length ? <div className="space-y-3">{customer.orders.slice(0, 5).map(o => <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><div className="font-bold text-slate-800">{o.order_number}</div><div className="mt-1 text-xs text-slate-500">{new Date(o.created_at).toLocaleString('id-ID')} · {o.items.length} item</div></div><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[o.status] || o.status}</span><div className="mt-2 text-sm font-extrabold">{formatIDR(o.total_amount)}</div><Link href={`/storefront/${hash}/orders/${o.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Detail pesanan →</Link></div></div>)}</div> : <p className="text-sm text-slate-500">Belum ada pesanan.</p>}</section>
      </main>
    </div>
  </div>;
}
