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
  Boxes,
  History,
  Wallet,
} from 'lucide-react';
import { getWebOrders, type WebOrder } from '@/graphql/query/order/webOrders';
import {
  orderCancel,
  orderComplete,
  orderConfirmPayment,
  orderCreateShipment,
  orderDeliverShipment,
  orderShipShipment,
} from '@/graphql/mutation/order/orderLifecycle';
import { downloadOrderInvoice } from '@/graphql/query/order/orderInvoice';
import { myStoresService } from '@/graphql/query/myStores';
import { formatIDR } from '@/lib/cart';
import {
  OrderStatusBadges,
  OrderTimeline,
  ExpiryCountdown,
  ShipmentList,
  PaymentBadge,
  FulfillmentBadge,
  LifecycleBadge,
} from '@/components/order/OrderStatusBadges';

type Store = { id: string | number; name: string };

// Filter sekarang per sumbu, bukan satu status gabungan yang ambigu.
const PAYMENT_OPTIONS = [
  { value: '', label: 'Semua pembayaran' },
  { value: 'unpaid', label: 'Belum bayar' },
  { value: 'awaiting_confirmation', label: 'Menunggu konfirmasi' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'refunded', label: 'Dikembalikan' },
  { value: 'expired', label: 'Kedaluwarsa' },
];

const FULFILLMENT_OPTIONS = [
  { value: '', label: 'Semua pengiriman' },
  { value: 'unfulfilled', label: 'Belum dikirim' },
  { value: 'processing', label: 'Disiapkan' },
  { value: 'partially_fulfilled', label: 'Sebagian dikirim' },
  { value: 'fulfilled', label: 'Terkirim' },
  { value: 'returned', label: 'Dikembalikan' },
];

const LIFECYCLE_OPTIONS = [
  { value: '', label: 'Semua siklus' },
  { value: 'open', label: 'Berjalan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default function WebOrdersPage() {
  const [token, setToken] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('');
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [payFilter, setPayFilter] = useState('');
  const [fulFilter, setFulFilter] = useState('');
  const [lifeFilter, setLifeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [courierInput, setCourierInput] = useState<Record<string, string>>({});

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
    async (sid: string) => {
      if (!token || !sid) return;
      setLoading(true);
      setError(null);
      try {
        // Filter sumbu dikerjakan di klien: query lama hanya mendukung `status`,
        // dan menarik 50 order terbaru lebih murah daripada menambah parameter.
        const res = await getWebOrders(token, sid, { page: 1, limit: 50 });
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
    if (storeId) loadOrders(storeId);
  }, [storeId, loadOrders]);

  const filtered = orders.filter((o) => {
    if (payFilter && o.payment_status !== payFilter) return false;
    if (fulFilter && o.fulfillment_status !== fulFilter) return false;
    if (lifeFilter && o.lifecycle_status !== lifeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.customer?.name ?? '').toLowerCase().includes(q)
    );
  });

  /** Bungkus satu aksi: matikan tombol, tampilkan error server apa adanya. */
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await loadOrders(storeId);
    } catch (e: any) {
      // Pesan guard dari server sengaja ditampilkan apa adanya — itulah
      // penjelasan kenapa tombol tidak boleh diklik.
      setError(e?.response?.errors?.[0]?.message ?? e?.message ?? 'Aksi gagal');
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

  const itemNames = (o: WebOrder) =>
    Object.fromEntries(o.items.map((it) => [String(it.id), it.name ?? 'item']));

  return (
    <div className="space-y-6">
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display flex items-center gap-2">
            <Package size={22} className="ds-icon-muted" /> Web Orders
          </h1>
          <p className="ds-small mt-1">
            Pesanan dari toko online Anda. Status dipisah jadi pembayaran, pengiriman, dan siklus.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="ds-select"
            style={{ width: 'auto' }}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="ds-select"
          style={{ width: 'auto' }}
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value)}
        >
          {PAYMENT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="ds-select"
          style={{ width: 'auto' }}
          value={fulFilter}
          onChange={(e) => setFulFilter(e.target.value)}
        >
          {FULFILLMENT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="ds-select"
          style={{ width: 'auto' }}
          value={lifeFilter}
          onChange={(e) => setLifeFilter(e.target.value)}
        >
          {LIFECYCLE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 ds-icon-muted" />
          <input
            className="ds-input"
            style={{ paddingLeft: 40 }}
            placeholder="Cari nomor order / nama customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="ds-alert" data-tone="bad">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin ds-accent-text" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ds-empty">
          <p className="ds-small">Tidak ada order yang cocok dengan filter ini.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => {
            const sisaBelumDikirim = o.fulfillment_status !== 'fulfilled';
            // `fulfilled` hanya berarti semua barang sudah masuk paket. Order
            // belum boleh ditutup selama masih ada paket yang belum diterima —
            // server juga menolaknya, tombolnya tidak boleh menawarkan.
            const semuaPaketDiterima =
              (o.shipments ?? []).length > 0 &&
              (o.shipments ?? []).every((s) => s.status === 'delivered');
            const bisaBatalkan =
              o.lifecycle_status === 'open' && o.payment_status !== 'paid';

            return (
              <li key={o.id} className="ds-card overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3">
                  <button
                    className="flex-1 flex items-center gap-4 text-left"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{o.order_number}</div>
                      <div className="ds-caption truncate">
                        {o.customer?.name ?? 'Guest'} •{' '}
                        {new Date(o.created_at).toLocaleString('id-ID')}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <PaymentBadge status={o.payment_status} />
                        <FulfillmentBadge status={o.fulfillment_status} />
                        <LifecycleBadge status={o.lifecycle_status} />
                        {o.payment_status === 'unpaid' && o.expires_at && (
                          <ExpiryCountdown expiresAt={o.expires_at} />
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold ds-num">{formatIDR(o.total_amount)}</span>
                    {o.additional_data?.unique_amount != null &&
                      Number(o.additional_data.unique_amount) !== Number(o.total_amount) && (
                        <span
                          className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"
                          title="Total termasuk kode unik transfer — cocokkan dengan mutasi"
                        >
                          Transfer: {formatIDR(Number(o.additional_data.unique_amount))}
                        </span>
                      )}
                    {expanded === o.id ? (
                      <ChevronUp size={18} className="ds-icon-muted" />
                    ) : (
                      <ChevronDown size={18} className="ds-icon-muted" />
                    )}
                  </button>
                  <button
                    onClick={() => invoice(o)}
                    disabled={busy}
                    className="ds-btn-sm"
                    data-tone="neutral"
                  >
                    <FileDown size={14} /> Invoice
                  </button>
                </div>

                {expanded === o.id && (
                  <div className="ds-subcard space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="ds-section-label">Customer</div>
                        <div className="mt-1 font-medium">{o.customer?.name ?? 'Guest'}</div>
                        <div className="ds-caption">
                          {o.customer?.email} {o.customer?.phone ? `• ${o.customer.phone}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="ds-section-label">Alamat Kirim</div>
                        <div className="mt-1 ds-caption">{o.shipping_address ?? '-'}</div>
                        {o.tracking_number && (
                          <div className="mt-1 ds-caption">Resi: {o.tracking_number}</div>
                        )}
                      </div>
                    </div>

                    <div className="ds-card divide-y">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                          <span className="pr-2">
                            {it.name} × {it.qty}
                            {it.store && (
                              <span className="ml-1.5 ds-badge" data-tone="info">
                                <Store size={9} /> {it.store.name}
                              </span>
                            )}
                          </span>
                          <span className="font-medium ds-num">{formatIDR(it.subtotal)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-2 text-sm font-bold">
                        <span>Total</span>
                        <span>{formatIDR(o.total_amount)}</span>
                      </div>
                      {o.additional_data?.unique_amount != null &&
                        Number(o.additional_data.unique_amount) !== Number(o.total_amount) && (
                          <div className="flex justify-between items-center px-3 py-2 text-sm bg-amber-50 rounded-lg">
                            <span className="font-semibold text-amber-700">
                              Harus ditransfer (kode unik)
                            </span>
                            <span className="font-extrabold text-amber-800">
                              {formatIDR(Number(o.additional_data.unique_amount))}
                            </span>
                          </div>
                        )}
                    </div>

                    {o.shipments?.length > 0 && (
                      <div>
                        <div className="ds-section-label mb-1.5 flex items-center gap-1">
                          <Boxes size={12} /> Paket ({o.shipments.length})
                        </div>
                        <ShipmentList shipments={o.shipments} itemNames={itemNames(o)} />
                        <div className="mt-2 space-y-1.5">
                          {o.shipments.map((s) => (
                            <div key={s.id} className="flex flex-wrap items-center gap-2">
                              <span className="ds-caption">Paket #{s.id}</span>
                              {s.status !== 'shipped' && s.status !== 'delivered' && (
                                <button
                                  onClick={() => act(() => orderShipShipment(token, s.id))}
                                  disabled={busy}
                                  className="ds-btn-sm"
                                >
                                  <Truck size={12} /> Kirim paket ini
                                </button>
                              )}
                              {s.status === 'shipped' && (
                                <button
                                  onClick={() => act(() => orderDeliverShipment(token, s.id))}
                                  disabled={busy}
                                  className="ds-btn-sm"
                                >
                                  <CheckCircle2 size={12} /> Tandai diterima
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tombol kontekstual: hanya aksi yang sah untuk status ini. */}
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                      {o.payment_status === 'unpaid' && (
                        <button
                          onClick={() => act(() => orderConfirmPayment(token, o.id, 'Transfer diterima'))}
                          disabled={busy}
                          className="ds-btn-sm"
                        >
                          <Wallet size={14} /> Konfirmasi Pembayaran
                        </button>
                      )}

                      {o.payment_status === 'paid' && sisaBelumDikirim && (
                        <>
                          <input
                            className="ds-input"
                            style={{ width: 130 }}
                            placeholder="Kurir (JNE)"
                            value={courierInput[o.id] ?? ''}
                            onChange={(e) =>
                              setCourierInput((p) => ({ ...p, [o.id]: e.target.value }))
                            }
                          />
                          <input
                            className="ds-input"
                            style={{ width: 160 }}
                            placeholder="No. resi (opsional)"
                            value={trackingInput[o.id] ?? ''}
                            onChange={(e) =>
                              setTrackingInput((p) => ({ ...p, [o.id]: e.target.value }))
                            }
                          />
                          <button
                            onClick={() =>
                              act(() =>
                                orderCreateShipment(token, {
                                  order_id: o.id,
                                  courier_name: courierInput[o.id] || undefined,
                                  courier_code: courierInput[o.id]?.toLowerCase() || undefined,
                                  tracking_number: trackingInput[o.id] || undefined,
                                }),
                              )
                            }
                            disabled={busy}
                            className="ds-btn-sm"
                          >
                            <Boxes size={14} /> Buat Paket (sisa)
                          </button>
                        </>
                      )}

                      {o.payment_status === 'paid' &&
                        !sisaBelumDikirim &&
                        semuaPaketDiterima &&
                        o.lifecycle_status === 'open' && (
                          <button
                            onClick={() => act(() => orderComplete(token, o.id, 'Semua paket diterima'))}
                            disabled={busy}
                            className="ds-btn-sm"
                          >
                            <CheckCircle2 size={14} /> Selesaikan Pesanan
                          </button>
                        )}

                      {bisaBatalkan && (
                        <button
                          onClick={() => act(() => orderCancel(token, o.id, 'Dibatalkan owner'))}
                          disabled={busy}
                          className="ds-btn"
                          data-variant="danger"
                          data-size="sm"
                        >
                          <XCircle size={14} /> Batalkan
                        </button>
                      )}
                    </div>

                    {o.lifecycle_status === 'open' &&
                      o.payment_status === 'paid' &&
                      !semuaPaketDiterima && (
                        <p className="ds-caption">
                          Tombol selesai muncul setelah semua barang masuk paket dan paket
                          ditandai diterima.
                        </p>
                      )}

                    <div>
                      <div className="ds-section-label mb-1.5 flex items-center gap-1">
                        <History size={12} /> Riwayat Status
                      </div>
                      <OrderTimeline entries={o.statusHistories ?? []} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t pt-2 ds-caption">
                      <span className="flex items-center gap-1">
                        Saluran: <strong>{o.channel ?? (o.is_web ? 'web' : 'chat')}</strong>
                      </span>
                      {o.paid_at && <span>• Dibayar {new Date(o.paid_at).toLocaleString('id-ID')}</span>}
                      {o.completed_at && (
                        <span>• Selesai {new Date(o.completed_at).toLocaleString('id-ID')}</span>
                      )}
                      {o.cancelled_at && (
                        <span>
                          • Dibatalkan {new Date(o.cancelled_at).toLocaleString('id-ID')}
                          {o.cancel_reason ? ` (${o.cancel_reason})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
