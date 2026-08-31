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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Link
          href="/owner/web-store"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke Web Store
        </Link>
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-medium">Memuat kategori...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Kembali ke Management Merchant
          </Link>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/30 backdrop-blur-sm">
              <FolderTree size={14} className="text-emerald-300" /> Kategori Produk
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Kelola Kategori Produk</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
              Atur kategori produk toko online Anda. Kategori dipakai untuk memfilter katalog di halaman
              storefront dan menata produk menjadi lebih rapi.
            </p>
          </div>
          <button
            onClick={() => openForm(null)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-400 text-slate-900 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 transition-all active:scale-95"
          >
            <Plus size={18} />
            Tambah Kategori
          </button>
        </div>
      </div>

      {!webStoreId && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium border bg-rose-50 text-rose-800 border-rose-200">
          <AlertCircle className="shrink-0 text-rose-600" size={20} />
          Web store belum terhubung. Silakan selesaikan Setup Web Store terlebih dahulu.
        </div>
      )}

      {/* Status alert */}
      {status && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all animate-in fade-in ${
            status.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {status.kind === 'ok' ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertCircle className="shrink-0 text-rose-600" size={20} />}
          {status.msg}
        </div>
      )}

      {/* Category list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Daftar Kategori ({categories.length})</h2>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
            <FolderTree size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Belum ada kategori</p>
            <p className="text-sm text-slate-400 mt-1">
              Klik "Tambah Kategori" untuk membuat kategori pertama toko Anda. Setelah itu assign ke produk
              di halaman Stock per Store.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  c.is_active ? 'border-slate-200/80' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500" />
                <div className="flex items-start justify-between gap-4 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base truncate">{c.name}</span>
                      {!c.is_active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {c.slug && (
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">/{c.slug}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                        <Tag size={11} /> Urutan {c.sort_order}
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-100 px-2 py-1 font-semibold text-blue-700">
                        {c.store_products?.length ?? 0} produk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openAssign(c)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <PackagePlus size={14} /> Assign Produk
                    </button>
                    <button
                      onClick={() => openForm(c)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      disabled={deletingId === c.id}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition-colors"
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderTree size={20} className="text-emerald-500" />
                {form.id ? 'Edit Kategori' : 'Kategori Baru'}
              </h3>
              <button onClick={closeForm} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Nama Kategori</label>
                <input
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Slug (opsional)</label>
                <input
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="minuman"
                  value={form.slug}
                  onChange={(e) => setForm((f) => (f ? { ...f, slug: e.target.value } : f))}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Slug dipakai di URL storefront (cth: /kategori/minuman). Kosongkan untuk otomatis dari nama.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Urutan (sort_order)</label>
                <input
                  type="number"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => (f ? { ...f, sort_order: Number(e.target.value) || 0 } : f))}
                />
              </div>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <div>
                  <span className="block text-sm font-bold text-slate-900">Kategori Aktif</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Kategori nonaktif tidak tampil di storefront.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => (f ? { ...f, is_active: e.target.checked } : f))}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-100 mt-5">
              <button
                onClick={closeForm}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAssignCat(null)} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus size={20} className="text-blue-500" />
                Assign Produk — {assignCat.name}
              </h3>
              <button onClick={() => setAssignCat(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Cari nama atau SKU produk…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <span className="text-xs font-semibold text-slate-400 shrink-0">{pickerSelected.size} dipilih</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {pickerLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                  <Loader2 size={18} className="animate-spin" /> Memuat produk…
                </div>
              ) : filteredPicker.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
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
                        className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                          checked
                            ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        {checked && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-2">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <PackagePlus size={22} />
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[11px] font-mono text-slate-400 truncate">{p.sku ?? '—'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setAssignCat(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveAssign}
                disabled={pickerSaving || pickerLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
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