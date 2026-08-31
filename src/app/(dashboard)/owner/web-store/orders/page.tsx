'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Package,
  ChevronDown,
  ChevronUp,
  FileDown,
  CheckCircle2,
  Truck,
  XCircle,
  Search,
  Store,
} from 'lucide-react';
import { getWebOrders, type WebOrder } from '@/graphql/query/order/webOrders';
import { updateOrderStatus } from '@/graphql/mutation/order/updateOrderStatus';
import { downloadOrderInvoice } from '@/graphql/query/order/orderInvoice';
import { myStoresService } from '@/graphql/query/myStores';
import { formatIDR } from '@/lib/cart';

type Store = { id: string | number; name: string };

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending_payment', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  paid: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

export default function WebOrdersPage() {
  const [token, setToken] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    myStoresService(token)
      .then((res) => {
        const arr = (res.myStores ?? []).map((s: any) => ({ id: String(s.id), name: s.name }));
        setStores(arr);
        if (arr.length) setStoreId((prev) => prev || arr[0].id);
      })
      .catch((e: any) => setError(e?.message ?? 'Gagal memuat store'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadOrders = useCallback(
    async (sid: string, status: string) => {
      if (!token || !sid) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getWebOrders(token, sid, { page: 1, limit: 50, status: status || undefined });
        setOrders(res.getOrdersByStore.data);
      } catch (e: any) {
        setError(e?.message ?? 'Gagal memuat order');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (storeId) loadOrders(storeId, statusFilter);
  }, [storeId, statusFilter, loadOrders]);

  const filtered = search
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search.toLowerCase()) ||
          (o.customer?.name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : orders;

  async function changeStatus(o: WebOrder, status: string) {
    setBusy(true);
    setError(null);
    try {
      await updateOrderStatus(token, o.id, status, trackingInput[o.id] || undefined);
      await loadOrders(storeId, statusFilter);
      setExpanded(null);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal ubah status');
    } finally {
      setBusy(false);
    }
  }

  async function invoice(o: WebOrder) {
    setBusy(true);
    setError(null);
    try {
      await downloadOrderInvoice(token, o.id, `invoice-${o.order_number}.pdf`);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal unduh invoice');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-blue-600" /> Web Orders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Pesanan dari toko online Anda.</p>
        </div>
        <div className="flex gap-3">
          <select
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Cari nomor order / nama customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin text-blue-600" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
          Belum ada web order di store ini.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <li key={o.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <button
                  className="flex-1 flex items-center gap-4 text-left"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">{o.order_number}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {o.customer?.name ?? 'Guest'} • {new Date(o.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[o.status] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {STATUS_OPTIONS.find((s) => s.value === o.status)?.label ?? o.status}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{formatIDR(o.total_amount)}</span>
                  {o.additional_data?.unique_amount != null && Number(o.additional_data.unique_amount) !== Number(o.total_amount) && (
                    <span
                      className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"
                      title="Total termasuk kode unik transfer — cocokkan dengan mutasi"
                    >
                      Transfer: {formatIDR(Number(o.additional_data.unique_amount))}
                    </span>
                  )}
                  {expanded === o.id ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => invoice(o)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileDown size={14} /> Invoice
                </button>
              </div>

              {expanded === o.id && (
                <div className="border-t bg-slate-50/60 px-4 py-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Customer</div>
                      <div className="mt-1 font-medium text-slate-800">{o.customer?.name ?? 'Guest'}</div>
                      <div className="text-xs text-slate-500">
                        {o.customer?.email} {o.customer?.phone ? `• ${o.customer.phone}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Alamat Kirim</div>
                      <div className="mt-1 text-xs text-slate-600">{o.shipping_address ?? '-'}</div>
                      {o.tracking_number && (
                        <div className="mt-1 text-xs text-slate-500">Resi: {o.tracking_number}</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border divide-y">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                        <span className="pr-2 text-slate-700">
                          {it.name} × {it.qty}
                          {it.store && (
                            <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                              <Store size={9} /> {it.store.name}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-slate-800">{formatIDR(it.subtotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 text-sm font-bold">
                      <span>Total</span>
                      <span>{formatIDR(o.total_amount)}</span>
                    </div>
                    {o.additional_data?.unique_amount != null && Number(o.additional_data.unique_amount) !== Number(o.total_amount) && (
                      <div className="flex justify-between items-center px-3 py-2 text-sm bg-amber-50 rounded-lg">
                        <span className="font-semibold text-amber-700">Harus ditransfer (kode unik)</span>
                        <span className="font-extrabold text-amber-800">{formatIDR(Number(o.additional_data.unique_amount))}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {o.status === 'pending_payment' && (
                      <button
                        onClick={() => changeStatus(o, 'paid')}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Tandai Dibayar
                      </button>
                    )}
                    {(o.status === 'pending_payment' || o.status === 'paid') && (
                      <>
                        <input
                          className="w-40 rounded-lg border px-2.5 py-1.5 text-xs"
                          placeholder="No. resi (opsional)"
                          value={trackingInput[o.id] ?? ''}
                          onChange={(e) => setTrackingInput((p) => ({ ...p, [o.id]: e.target.value }))}
                        />
                        <button
                          onClick={() => changeStatus(o, 'shipped')}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Truck size={14} /> Kirim
                        </button>
                      </>
                    )}
                    {(o.status === 'shipped' || o.status === 'paid') && (
                      <button
                        onClick={() => changeStatus(o, 'completed')}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Selesai
                      </button>
                    )}
                    {o.status !== 'cancelled' && o.status !== 'completed' && (
                      <button
                        onClick={() => changeStatus(o, 'cancelled')}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <XCircle size={14} /> Batalkan
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
