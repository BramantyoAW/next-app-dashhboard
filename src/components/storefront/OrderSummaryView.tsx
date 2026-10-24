'use client';
import Link from 'next/link';
import { formatIDR } from '@/lib/cart';
import { CheckCircle2 } from 'lucide-react';

export type ThankYouOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  discount: number | null;
  shipping_cost: number | null;
  shipping_address: string | null;
  tracking_number: string | null;
  additional_data: {
    unique_amount?: number | null;
    base_amount?: number | null;
    fulfillment_type?: string | null;
    payment_method?: {
      name?: string | null;
      bank_name?: string | null;
      account_number?: string | null;
      account_name?: string | null;
      instructions?: string | null;
    } | null;
    shipping?: Record<string, unknown> | null;
  } | null;
  items: { id: string; store_id?: string | null; name: string | null; qty: number; price: number; subtotal: number; store?: { id: string; name: string } | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};
const STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  paid: 'bg-sky-100 text-sky-700',
  processing: 'bg-violet-100 text-violet-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

/**
 * Ringkasan pesanan pada halaman terima kasih — FIXED, tidak customable.
 * Data berasal langsung dari order (server), bukan dari konten halaman.
 */
export default function OrderSummaryView({ hash, o }: { hash: string; o: ThankYouOrder }) {
  const statusLabel = STATUS_LABEL[o.status] ?? o.status;
  const statusStyle = STATUS_STYLE[o.status] ?? 'bg-neutral-100 text-neutral-600';
  const pm = o.additional_data?.payment_method;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-[var(--line,rgba(22,22,22,0.12))] bg-white p-6 shadow-sm sm:p-8">
      {/* Head sukses */}
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--accent, #c5a880)', color: 'var(--brand-contrast, #161616)' }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}>
            Pesanan {o.order_number}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {new Date(o.created_at).toLocaleString('id-ID')} ·{' '}
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statusStyle}`}>{statusLabel}</span>
          </p>
        </div>
      </div>

      {/* Item */}
      <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
        {o.items.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
            <span className="font-medium text-slate-700">
              {i.name} × {i.qty}
            </span>
            <span className="shrink-0 font-semibold text-slate-800">{formatIDR(i.subtotal)}</span>
          </li>
        ))}
      </ul>

      {/* Biaya */}
      <div className="mt-1 space-y-1.5 text-sm">
        {o.discount ? (
          <div className="flex justify-between text-slate-500">
            <span>Diskon</span>
            <span className="font-semibold text-emerald-600">-{formatIDR(o.discount)}</span>
          </div>
        ) : null}
        {o.shipping_cost ? (
          <div className="flex justify-between text-slate-500">
            <span>Ongkir</span>
            <span className="font-semibold text-slate-700">{formatIDR(o.shipping_cost)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
          <span>Total</span>
          <span>{formatIDR(o.total_amount)}</span>
        </div>
      </div>

      {/* Pembayaran & alamat (informasi, bila ada) */}
      {(pm || o.shipping_address || o.tracking_number) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {pm && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pembayaran</div>
              <div className="mt-1 font-semibold">{pm.name || 'Bank Transfer'}</div>
              {pm.bank_name && <div className="text-slate-500">{pm.bank_name}</div>}
              {pm.account_number && <div className="text-slate-500">No. {pm.account_number}</div>}
              {o.additional_data?.unique_amount != null && (
                <div className="mt-1 text-xs text-slate-500">
                  Transfer tepat <b>{formatIDR(Number(o.additional_data.unique_amount))}</b> (termasuk kode unik)
                </div>
              )}
            </div>
          )}
          {o.shipping_address && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {o.additional_data?.fulfillment_type === 'pickup' ? 'Ambil di Outlet' : 'Alamat Kirim'}
              </div>
              <div className="mt-1">{o.shipping_address}</div>
            </div>
          )}
          {o.tracking_number && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Nomor Resi</div>
              <div className="mt-1 font-mono font-bold">{o.tracking_number}</div>
            </div>
          )}
        </div>
      )}

      {/* Aksi */}
      <div className="mt-7 flex flex-wrap gap-2">
        <Link
          href={`/storefront/${hash}`}
          className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'var(--brand, #161616)' }}
        >
          Kembali Belanja
        </Link>
        <Link
          href={`/storefront/${hash}/orders`}
          className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Semua Pesanan
        </Link>
      </div>
    </div>
  );
}
