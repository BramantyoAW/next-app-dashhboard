'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  FolderTree,
  Trash2,
  X,
  Tag,
  PackagePlus,
  Search,
  Check,
} from 'lucide-react';
import { getWebStoreByOwner, listWebStoreCategories, listMasterProducts, type ProductCategory } from '@/graphql/query/webstore';
import {
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  assignCategoryProducts,
  type CreateProductCategoryInput,
  type UpdateProductCategoryInput,
} from '@/graphql/mutation/webstore';
import { decodeJwt } from '@/lib/jwt';
import { resolveImageUrl } from '@/lib/imageUtils';

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type PickerProduct = {
  key: string;
  name: string;
  sku: string | null;
  image: string | null;
  storeProductIds: string[];
  assignedStoreProductIds: string[];
};

const emptyForm = (): FormState => ({ id: null, name: '', slug: '', sort_order: 0, is_active: true });

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function OwnerWebStoreCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [webStoreId, setWebStoreId] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // ── Assign-products modal state ──
  const [assignCat, setAssignCat] = useState<ProductCategory | null>(null);
  const [pickerProducts, setPickerProducts] = useState<PickerProduct[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);

  const loadCategories = useCallback(async (token: string, wid: string) => {
    const res = await listWebStoreCategories(token, wid);
    return res.webStoreCategories ?? [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
      if (!token) { setLoading(false); return; }
      try {
        const payload = decodeJwt(token);
        const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
        if (!ownerId) { setLoading(false); return; }
        const wsRes = await getWebStoreByOwner(ownerId, token);
        if (cancelled) return;
        const w = wsRes.webStoreByOwner;
        if (!w) { setLoading(false); return; }
        const wid = String(w.id);
        setWebStoreId(wid);
        const cats = await loadCategories(token, wid);
        if (!cancelled) setCategories(cats);
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', msg: e?.message ?? 'Gagal memuat data' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadCategories]);

  function openForm(cat?: ProductCategory | null) {
    setStatus(null);
    if (cat) {
      setForm({
        id: cat.id,
        name: cat.name,
        slug: cat.slug ?? '',
        sort_order: cat.sort_order,
        is_active: cat.is_active,
      });
    } else {
      setForm(emptyForm());
    }
  }

  function closeForm() {
    setForm(null);
    setStatus(null);
  }

  async function save() {
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    if (!form) return;
    const name = form.name.trim();
    if (!name) return setStatus({ kind: 'err', msg: 'Nama kategori wajib diisi.' });
    setSaving(true);
    try {
      if (form.id) {
        const input: UpdateProductCategoryInput = {
          id: form.id,
          name,
          slug: form.slug.trim() ? form.slug.trim() : null,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        };
        await updateProductCategory(token, input);
      } else {
        const input: CreateProductCategoryInput = {
          web_store_id: webStoreId,
          name,
          slug: form.slug.trim() ? form.slug.trim() : null,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        };
        await createProductCategory(token, input);
      }
      const cats = await loadCategories(token, webStoreId);
      setCategories(cats);
      setForm(null);
      setStatus({ kind: 'ok', msg: form.id ? 'Kategori berhasil diperbarui!' : 'Kategori berhasil dibuat!' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan kategori' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(cat: ProductCategory) {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    setDeletingId(cat.id);
    try {
      await deleteProductCategory(token, cat.id);
      const cats = await loadCategories(token, webStoreId);
      setCategories(cats);
      setStatus({ kind: 'ok', msg: `Kategori "${cat.name}" dihapus.` });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menghapus kategori' });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Assign products to a category ──
  const openAssign = useCallback(async (cat: ProductCategory) => {
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    setAssignCat(cat);
    setPickerSearch('');
    setPickerProducts([]);
    setPickerLoading(true);
    try {
      // Semua master product milik owner (dedupe per SKU, sesuai model
      // master product per harga). Row store product dari outlet manapun
      // dipakai sebagai target assignment.
      const res = await listMasterProducts(token, { page: 1, limit: 200 });
      const assignedMpIds = new Set((cat.store_products ?? []).map((sp) => String(sp.master_product_id ?? '')));
      const rows: PickerProduct[] = (res.masterProducts?.data ?? []).map((mp: any) => {
        const spIds = (mp.store_products ?? [])
          .filter((sp: any) => sp.is_active !== false)
          .map((sp: any) => String(sp.id));
        return {
          key: String(mp.id),
          name: mp.name,
          sku: mp.sku ?? null,
          image: mp.image ?? null,
          storeProductIds: spIds,
          assignedStoreProductIds: spIds.filter((sid: string) => (cat.store_products ?? []).some((csp) => String(csp.id) === sid)),
          // helper: apakah master product ini dianggap ter-assign
          ...(assignedMpIds.has(String(mp.id)) ? {} : {}),
        } as PickerProduct;
      });
      // Preselect: master product yang salah satu store product-nya ada di kategori.
      const pre = new Set<string>();
      for (const row of rows) {
        if (row.assignedStoreProductIds.length > 0) pre.add(row.key);
      }
      setPickerProducts(rows);
      setPickerSelected(pre);
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal memuat produk' });
      setAssignCat(null);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  function togglePicker(key: string) {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveAssign() {
    if (!assignCat) return;
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    setPickerSaving(true);
    try {
      // Satu master product → satu row store product perwakilan (outlet pertama
      // yang aktif) sesuai model katalog dedupe per SKU.
      const targets: string[] = [];
      for (const row of pickerProducts) {
        if (!pickerSelected.has(row.key)) continue;
        const targetId = row.assignedStoreProductIds[0] ?? row.storeProductIds[0];
        if (targetId) targets.push(targetId);
      }
      await assignCategoryProducts(token, assignCat.id, targets);
      const cats = await loadCategories(token, webStoreId);
      setCategories(cats);
      setAssignCat(null);
      setStatus({ kind: 'ok', msg: `Produk untuk kategori "${assignCat.name}" tersimpan.` });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal assign produk' });
    } finally {
      setPickerSaving(false);
    }
  }

  const filteredPicker = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return pickerProducts;
    return pickerProducts.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q));
  }, [pickerProducts, pickerSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 ds-small">
        <Link
          href="/owner/web-store"
          className="ds-link inline-flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke Web Store
        </Link>
        <Loader2 className="animate-spin ds-accent-text" size={32} />
        <span className="ds-body font-medium">Memuat kategori...</span>
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
            className="ds-small inline-flex items-center gap-1.5 transition-colors mb-3"
          >
            <ArrowLeft size={16} />
            Kembali ke Management Merchant
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <FolderTree size={15} className="ds-icon-muted" />
            <span className="ds-section-label">Kategori Produk</span>
          </div>
          <h1 className="ds-display">Kelola Kategori Produk</h1>
          <p className="ds-small mt-1 max-w-xl">
            Atur kategori produk toko online Anda. Kategori dipakai untuk memfilter katalog di halaman
            storefront dan menata produk menjadi lebih rapi.
          </p>
        </div>
        <button onClick={() => openForm(null)} className="ds-btn" data-variant="primary">
          <Plus size={16} />
          Tambah Kategori
        </button>
      </div>

      {!webStoreId && (
        <div className="ds-alert" data-tone="bad">
          <AlertCircle className="shrink-0 text-rose-600" size={20} />
          Web store belum terhubung. Silakan selesaikan Setup Web Store terlebih dahulu.
        </div>
      )}

      {/* Status alert */}
      {status && (
        <div
          className="ds-alert transition-all animate-in fade-in"
          data-tone={status.kind === 'ok' ? 'ok' : 'bad'}
        >
          {status.kind === 'ok' ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertCircle className="shrink-0 text-rose-600" size={20} />}
          {status.msg}
        </div>
      )}

      {/* Category list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="ds-h1">Daftar Kategori ({categories.length})</h2>
        </div>

        {categories.length === 0 ? (
          <div className="ds-empty">
            <div className="ds-empty-icon">
              <FolderTree size={20} />
            </div>
            <p className="ds-h2">Belum ada kategori</p>
            <p className="ds-small mt-1">
              Klik "Tambah Kategori" untuk membuat kategori pertama toko Anda. Setelah itu assign ke produk
              di halaman Stock per Store.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className={`ds-card relative overflow-hidden p-5 transition-all ${c.is_active ? '' : 'opacity-70'}`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: 'var(--ds-primary)' }} />
                <div className="flex items-start justify-between gap-4 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="ds-h2 truncate">{c.name}</span>
                      {!c.is_active && (
                        <span className="ds-badge">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {c.slug && (
                      <p className="mt-0.5 ds-mono">/{c.slug}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 ds-caption">
                      <span className="ds-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Tag size={11} /> Urutan {c.sort_order}
                      </span>
                      <span className="ds-chip inline-flex items-center font-semibold ds-accent-text">
                        {c.store_products?.length ?? 0} produk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openAssign(c)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                    >
                      <PackagePlus size={14} /> Assign Produk
                    </button>
                    <button
                      onClick={() => openForm(c)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      disabled={deletingId === c.id}
                      className="ds-btn-sm"
                      data-tone="neutral"
                      style={{ color: 'var(--ds-danger)' }}
                      aria-label={`Hapus ${c.name}`}
                    >
                      {deletingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(15, 23, 42, 0.4)' }} onClick={closeForm} />
          <div className="ds-card relative z-10 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="ds-h1 flex items-center gap-2">
                <FolderTree size={20} className="ds-accent-text" />
                {form.id ? 'Edit Kategori' : 'Kategori Baru'}
              </h3>
              <button onClick={closeForm} className="ds-btn-sm" data-tone="neutral">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="ds-label">Nama Kategori</label>
                <input
                  className="ds-input"
                  placeholder="contoh: Minuman"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, name: e.target.value, slug: f.slug || toSlug(e.target.value) } : f
                    )
                  }
                />
              </div>

              <div>
                <label className="ds-label">Slug (opsional)</label>
                <input
                  className="ds-input ds-mono"
                  placeholder="minuman"
                  value={form.slug}
                  onChange={(e) => setForm((f) => (f ? { ...f, slug: e.target.value } : f))}
                />
                <p className="ds-hint">
                  Slug dipakai di URL storefront (cth: /kategori/minuman). Kosongkan untuk otomatis dari nama.
                </p>
              </div>

              <div>
                <label className="ds-label">Urutan (sort_order)</label>
                <input
                  type="number"
                  className="ds-input ds-num"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => (f ? { ...f, sort_order: Number(e.target.value) || 0 } : f))}
                />
              </div>

              <label className="ds-toggle-row">
                <div>
                  <span className="ds-h2 block">Kategori Aktif</span>
                  <span className="ds-caption block mt-0.5">
                    Kategori nonaktif tidak tampil di storefront.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="ds-switch"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => (f ? { ...f, is_active: e.target.checked } : f))}
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
                {form.id ? 'Simpan Perubahan' : 'Buat Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign products modal */}
      {assignCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(15, 23, 42, 0.4)' }} onClick={() => setAssignCat(null)} />
          <div className="ds-card relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="ds-section flex items-center justify-between px-6 py-4">
              <h3 className="ds-h1 flex items-center gap-2">
                <PackagePlus size={20} className="ds-accent-text" />
                Assign Produk — {assignCat.name}
              </h3>
              <button onClick={() => setAssignCat(null)} className="ds-btn-sm" data-tone="neutral" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pt-4 pb-3 ds-divider-top">
              <div className="ds-well flex items-center gap-2" style={{ padding: '0 12px', height: 36 }}>
                <Search size={15} className="ds-icon-muted shrink-0" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Cari nama atau SKU produk…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <span className="ds-caption shrink-0">{pickerSelected.size} dipilih</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {pickerLoading ? (
                <div className="ds-small flex items-center justify-center gap-2 py-12">
                  <Loader2 size={18} className="animate-spin" /> Memuat produk…
                </div>
              ) : filteredPicker.length === 0 ? (
                <div className="ds-note py-12">
                  {pickerProducts.length === 0 ? 'Belum ada master product.' : 'Tidak ada produk yang cocok dengan pencarian.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredPicker.map((p) => {
                    const checked = pickerSelected.has(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => togglePicker(p.key)}
                        className={`relative text-left p-3 transition-all ${
                          checked
                            ? 'ds-well'
                            : 'ds-card'
                        }`}
                        data-tone={checked ? 'accent' : undefined}
                      >
                        {checked && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' }}>
                            <Check size={12} />
                          </span>
                        )}
                        <div className="ds-well w-full aspect-square overflow-hidden mb-2" style={{ padding: 0 }}>
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center ds-icon-muted">
                              <PackagePlus size={22} />
                            </div>
                          )}
                        </div>
                        <p className="ds-h2 truncate">{p.name}</p>
                        <p className="ds-mono truncate">{p.sku ?? '—'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ds-divider-top flex items-center justify-end gap-2 px-6 py-4">
              <button
                onClick={() => setAssignCat(null)}
                className="ds-btn"
                data-variant="ghost"
              >
                Batal
              </button>
              <button
                onClick={saveAssign}
                disabled={pickerSaving || pickerLoading}
                className="ds-btn"
                data-variant="primary"
              >
                {pickerSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Simpan Assignment ({pickerSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}