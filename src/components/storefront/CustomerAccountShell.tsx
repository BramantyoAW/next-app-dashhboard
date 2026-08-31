import Link from 'next/link';
import { CustomerLogoutButton } from '@/components/storefront/CustomerLogoutButton';

export type AccountCustomer = {
  id: string; name: string; email: string; phone?: string | null; created_at: string;
  addresses: { id: string; label?: string | null; recipient: string; phone: string; address_line: string; city?: string | null; province?: string | null; postal_code?: string | null; is_default: boolean }[];
};

export function CustomerAccountShell({ hash, customer, active, title, description, children }: { hash: string; customer: AccountCustomer; active: string; title: string; description?: string; children: React.ReactNode }) {
  const menu = [
    ['dashboard', 'Dashboard Akun', `/storefront/${hash}/account`],
    ['information', 'Informasi Akun', `/storefront/${hash}/account/information`],
    ['address', 'Address Book', `/storefront/${hash}/account/address-book`],
    ['orders', 'Pesanan Saya', `/storefront/${hash}/orders`],
  ];
  return <div className="mx-auto max-w-6xl px-1 py-2"><div className="mb-7 border-b border-slate-200 pb-5"><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div><div className="grid gap-8 lg:grid-cols-[230px_1fr]"><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="hidden border-b border-slate-100 px-3 pb-3 lg:block"><div className="text-xs uppercase tracking-wider text-slate-400">Halo,</div><div className="font-bold text-slate-900">{customer.name}</div></div><nav className="flex gap-2 overflow-x-auto pt-3 lg:flex-col lg:space-y-1 lg:space-x-0">{menu.map(([key, label, href]) => <Link key={key} href={href} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ${active === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>)}<Link href={`/storefront/${hash}`} className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Lanjut Belanja</Link><CustomerLogoutButton hash={hash} /></nav></aside><main>{children}</main></div></div>;
}

export function CustomerInformation({ customer }: { customer: AccountCustomer }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold text-slate-900">Informasi Akun</h2><div className="grid gap-5 sm:grid-cols-2"><div><div className="text-xs font-semibold uppercase text-slate-400">Nama</div><div className="mt-1 font-semibold text-slate-800">{customer.name}</div></div><div><div className="text-xs font-semibold uppercase text-slate-400">Email</div><div className="mt-1 font-semibold text-slate-800">{customer.email}</div></div><div><div className="text-xs font-semibold uppercase text-slate-400">Nomor HP</div><div className="mt-1 font-semibold text-slate-800">{customer.phone || 'Belum diisi'}</div></div><div><div className="text-xs font-semibold uppercase text-slate-400">Member sejak</div><div className="mt-1 font-semibold text-slate-800">{new Date(customer.created_at).toLocaleDateString('id-ID')}</div></div></div></section>; }

export function CustomerAddresses({ customer }: { customer: AccountCustomer }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold text-slate-900">Address Book</h2>{customer.addresses.length ? <div className="grid gap-3 sm:grid-cols-2">{customer.addresses.map(a => <div key={a.id} className="rounded-xl border border-slate-200 p-4 text-sm"><div className="font-bold">{a.label || 'Alamat'} {a.is_default && <span className="ml-1 text-xs text-emerald-600">Utama</span>}</div><div className="mt-1 text-slate-600">{a.recipient} · {a.phone}<br />{a.address_line}{a.city ? `, ${a.city}` : ''}{a.province ? `, ${a.province}` : ''} {a.postal_code || ''}</div></div>)}</div> : <p className="text-sm text-slate-500">Belum ada alamat tersimpan.</p>}</section>; }
