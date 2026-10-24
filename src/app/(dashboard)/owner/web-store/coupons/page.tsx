'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Ticket,
  Trash2,
  Percent,
  Banknote,
  CalendarRange,
  Tag,
  X,
} from 'lucide-react';
import { getWebStoreByOwner, type WebStore } from '@/graphql/query/webstore';
import { upsertCoupon, deleteCoupon, type Coupon, type CouponInput } from '@/graphql/mutation/webstore';
import { decodeJwt } from '@/lib/jwt';
import { formatIDR } from '@/lib/cart';

type CouponType = 'percent' | 'fixed';

const emptyForm = (): CouponInput & { id?: string | null } => ({
  id: null,
  code: '',
  type: 'percent',
  value: 0,
  max_discount: null,
  min_order: null,
  usage_limit: null,
  starts_at: null,
  expires_at: null,
  is_active: true,
});

function readInitialCoupons(ws: WebStore | null): Coupon[] {
  const raw = ws?.settings?.coupons;
  if (!Array.isArray(raw)) return [];
  return raw.map((c: any) => ({
    id: String(c?.id ?? ''),
    code: String(c?.code ?? ''),
    type: String(c?.type ?? 'percent'),
    value: Number(c?.value ?? 0) || 0,
    max_discount: c?.max_discount != null ? Number(c.max_discount) : null,
    min_order: c?.min_order != null ? Number(c.min_order) : null,
    usage_limit: c?.usage_limit != null ? Number(c.usage_limit) : null,
    used_count: Number(c?.used_count ?? 0) || 0,
    starts_at: c?.starts_at ?? null,
    expires_at: c?.expires_at ?? null,
    is_active: !!c?.is_active,
  }));
}

export default function OwnerWebStoreCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ws, setWs] = useState<WebStore | null>(null);
  const [webStoreId, setWebStoreId] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<CouponInput & { id?: string | null } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
      if (!token) { setLoading(false); return; }
      try {
        const payload = decodeJwt(token);
        const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
        if (!ownerId) { setLoading(false); return; }
        const res = await getWebStoreByOwner(ownerId, token);
        if (cancelled) return;
        const w = res.webStoreByOwner;
        setWs(w);
        if (w) {
          setWebStoreId(String(w.id));
          setCoupons(readInitialCoupons(w));
        }
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', msg: e?.message ?? 'Gagal memuat data' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback((list: Coupon[]) => {
    setCoupons(list);
    setEditing(null);
    setShowForm(false);
  }, []);

  function openForm(c?: Coupon | null) {
    setStatus(null);
    if (c) {
      setEditing({
        id: c.id,
        code: c.code,
        type: c.type as CouponType,
        value: c.value,
        max_discount: c.max_discount ?? null,
        min_order: c.min_order ?? null,
        usage_limit: c.usage_limit ?? null,
        starts_at: c.starts_at ?? null,
        expires_at: c.expires_at ?? null,
        is_active: c.is_active,
      });
    } else {
      setEditing(emptyForm());
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setStatus(null);
  }

  async function save() {
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    if (!webStoreId) return setStatus({ kind: 'err', msg: 'Web store belum terhubung.' });
    if (!editing) return;
    const code = (editing.code ?? '').trim();
    if (!code) return setStatus({ kind: 'err', msg: 'Kode kupon wajib diisi.' });
    if (!(editing.value > 0)) return setStatus({ kind: 'err', msg: 'Nilai diskon harus > 0.' });
    if (editing.type === 'percent' && editing.value > 100) {
      return setStatus({ kind: 'err', msg: 'Persentase diskon maksimal 100%.' });
    }
    setSaving(true);
    try {
      const payload: CouponInput = {
        id: editing.id,
        code: code.toUpperCase(),
        type: editing.type,
        value: editing.value,
        max_discount: editing.type === 'percent' ? editing.max_discount : null,
        min_order: editing.min_order,
        usage_limit: editing.usage_limit,
        starts_at: editing.starts_at || null,
        expires_at: editing.expires_at || null,
        is_active: editing.is_active,
      };
      const res = await upsertCoupon(token, webStoreId, payload);
      setWs((prev) =>
        prev ? { ...prev, settings: { ...(prev.settings ?? {}), coupons: res.upsertCoupon } } : prev,
      );
      refresh(res.upsertCoupon);
      setStatus({ kind: 'ok', msg: 'Kupon berhasil disimpan!' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan kupon' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`Hapus kupon "${c.code}"?`)) return;
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    try {
      const res = await deleteCoupon(token, webStoreId, c.id);
      setWs((prev) =>
        prev ? { ...prev, settings: { ...(prev.settings ?? {}), coupons: res.deleteCoupon } } : prev,
      );
      refresh(res.deleteCoupon);
      setStatus({ kind: 'ok', msg: `Kupon "${c.code}" dihapus.` });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menghapus kupon' });
    }
  }

  function discountLabel(c: Coupon): string {
    if (c.type === 'percent') {
      const base = `${Number(c.value) || 0}%`;
      return c.max_discount ? `${base} (maks ${formatIDR(Number(c.max_discount))})` : base;
    }
    return formatIDR(Number(c.value) || 0);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 ds-small">
        <Link
          href="/owner/web-store"
          className="inline-flex items-center gap-1.5 mb-4 ds-link"
        >
          <ArrowLeft size={16} />
          Kembali ke Web Store
        </Link>
        <Loader2 className="animate-spin ds-accent-text" size={32} />
        <span className="text-sm font-medium">Memuat kupon...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="ds-page-head">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mb-3 ds-small"
          >
            <ArrowLeft size={16} />
            Kembali ke Management Merchant
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Ticket size={15} className="ds-icon-muted" />
            <span className="ds-section-label">Kupon Diskon</span>
          </div>
          <h1 className="ds-display">Kelola Kupon Diskon</h1>
          <p className="ds-small mt-1 max-w-xl">
            Buat kode diskon untuk toko online Anda. Pelanggan memasukkan kode saat checkout untuk
            mendapatkan potongan harga otomatis.
          </p>
        </div>
        <button onClick={() => openForm(null)} className="ds-btn" data-variant="primary">
          <Plus size={16} />
          Tambah Kupon
        </button>
      </div>

      {!webStoreId && (
        <div className="ds-alert">
          <AlertCircle className="shrink-0 text-rose-600" size={20} />
          Web store belum terhubung. Silakan selesaikan Setup Web Store terlebih dahulu.
        </div>
      )}

      {/* Status alert */}
      {status && (
        <div className="ds-alert animate-in fade-in" data-tone={status.kind === 'ok' ? 'ok' : 'bad'}>
          {status.kind === 'ok' ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertCircle className="shrink-0 text-rose-600" size={20} />}
          {status.msg}
        </div>
      )}

      {/* Coupon list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="ds-h2">Daftar Kupon ({coupons.length})</h2>
        </div>

        {coupons.length === 0 ? (
          <div className="ds-empty">
            <div className="ds-empty-icon">
              <Ticket size={18} />
            </div>
            <p className="ds-h2">Belum ada kupon</p>
            <p className="ds-small">
              Klik "Tambah Kupon" untuk membuat kode diskon pertama toko Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map((c) => (
              <div
                key={c.id}
                className={`ds-card relative overflow-hidden p-5 ${c.is_active ? '' : 'opacity-70'}`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
                <div className="flex items-start justify-between gap-4 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-lg tracking-tight truncate">
                        {c.code}
                      </span>
                      {!c.is_active && (
                        <span className="ds-badge uppercase">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-sm font-bold ds-accent-text"
                      style={{ background: 'var(--ds-surface-2)', borderRadius: 'var(--ds-radius-sm)' }}
                    >
                      {c.type === 'percent' ? <Percent size={14} /> : <Banknote size={14} />}
                      {discountLabel(c)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openForm(c)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      aria-label={`Hapus ${c.code}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-2 ds-caption">
                  {c.min_order ? (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={12} /> Min. {formatIDR(c.min_order)}
                    </span>
                  ) : null}
                  {c.usage_limit ? (
                    <span className="inline-flex items-center gap-1">
                      Max {c.usage_limit} kali {c.used_count > 0 ? `(dipakai ${c.used_count})` : ''}
                    </span>
                  ) : (
                    <span>Tanpa batas pemakaian</span>
                  )}
                  {(c.starts_at || c.expires_at) && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange size={12} />
                      {c.starts_at ? new Date(c.starts_at).toLocaleDateString('id-ID') : 'sekarang'}
                      {' → '}
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('id-ID') : 'selamanya'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(15, 23, 42, 0.4)' }}
            onClick={closeForm}
          />
          <div className="ds-card relative z-10 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="ds-h1 flex items-center gap-2">
                <Ticket size={20} className="text-amber-500" />
                {editing.id ? 'Edit Kupon' : 'Kupon Baru'}
              </h3>
              <button onClick={closeForm} className="ds-btn" data-variant="ghost">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Kode Kupon</label>
                  <input
                    className="ds-input font-mono uppercase tracking-wider"
                    placeholder="contoh: PROMO10"
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="ds-label">Jenis Diskon</label>
                  <select
                    className="ds-select"
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as CouponType })}
                  >
                    <option value="percent">Persen (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Nilai / Besaran</label>
                  <input
                    type="number"
                    min="0"
                    step={editing.type === 'percent' ? '1' : 'any'}
                    className="ds-input"
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) || 0 })}
                  />
                </div>
                {editing.type === 'percent' && (
                  <div>
                    <label className="ds-label">Diskon Maks (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      className="ds-input"
                      placeholder="Opsional"
                      value={editing.max_discount ?? ''}
                      onChange={(e) => setEditing({ ...editing, max_discount: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Min. Belanja (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    className="ds-input"
                    placeholder="Opsional"
                    value={editing.min_order ?? ''}
                    onChange={(e) => setEditing({ ...editing, min_order: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="ds-label">Batas Pemakaian</label>
                  <input
                    type="number"
                    min="0"
                    className="ds-input"
                    placeholder="Kosongkan = tanpa batas"
                    value={editing.usage_limit ?? ''}
                    onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Berlaku Mulai</label>
                  <input
                    type="datetime-local"
                    className="ds-input"
                    value={toLocalInput(editing.starts_at)}
                    onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? toIso(e.target.value) : null })}
                  />
                </div>
                <div>
                  <label className="ds-label">Berlaku Sampai</label>
                  <input
                    type="datetime-local"
                    className="ds-input"
                    value={toLocalInput(editing.expires_at)}
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? toIso(e.target.value) : null })}
                  />
                </div>
              </div>

              <label className="ds-toggle-row">
                <div>
                  <span className="block ds-h2">Kupon Aktif</span>
                  <span className="block ds-caption mt-0.5">
                    Kupon nonaktif tidak dapat digunakan saat checkout.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="ds-switch"
                  checked={!!editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
              </label>
            </div>

            <div className="ds-divider-top flex items-center justify-end gap-2 mt-5">
              <button
                onClick={closeForm}
                className="ds-btn"
                data-variant="ghost"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="ds-btn"
                data-variant="primary"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                {editing.id ? 'Simpan Perubahan' : 'Buat Kupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}