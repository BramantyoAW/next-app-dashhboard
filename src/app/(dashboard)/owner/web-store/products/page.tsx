'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMasterProducts } from '@/graphql/query/webstore';
import { upsertMasterProduct, deleteMasterProduct, uploadProductImage } from '@/graphql/mutation/webstore';
import { myStoresService } from '@/graphql/query/myStores';
import type { MasterProduct, Paginated, ProductAttribute } from '@/graphql/query/webstore';
import { Plus, Trash2, Loader2, Search, AlertCircle, X, ImagePlus, RotateCcw, Tag } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUtils';

type StoreOption = { id: string; name: string };

export default function MasterProductsPage() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState<MasterProduct[]>([]);
  const [pagination, setPagination] = useState<Paginated<MasterProduct>['current_page'] extends never ? never : Paginated<MasterProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Partial<MasterProduct> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftAttrs, setDraftAttrs] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    myStoresService(token)
      .then((res) => setStores((res.myStores ?? []).map((s: any) => ({ id: String(s.id), name: s.name }))))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    listMasterProducts(token, {
      search: search || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      store_id: storeId || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.masterProducts.data);
        setPagination(res.masterProducts as any);
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? 'Failed to load products'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [token, search, minPrice, maxPrice, storeId, page]);

  async function save() {
    if (!editing || !token) return;
    setSaving(true);
    setError(null);
    try {
      const cleanedAttrs = draftAttrs.filter((a) => a.name.trim() && a.value.trim());
      await upsertMasterProduct(token, {
        id: editing.id ? String(editing.id) : null,
        sku: editing.sku ?? null,
        name: editing.name ?? '',
        description: editing.description ?? null,
        price: typeof editing.price === 'number' ? editing.price : Number(editing.price) || 0,
        image: editing.image ?? null,
        attributes: cleanedAttrs,
        is_active: editing.is_active ?? true,
        default_store_id: editing.default_store_id ? String(editing.default_store_id) : null,
      });
      setEditing(null);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? 'Save gagal');
    } finally {
      setSaving(false);
    }
  }

  async function toggleMasterActive(p: MasterProduct) {
    if (!token) return;
    setError(null);
    try {
      await upsertMasterProduct(token, {
        id: String(p.id),
        name: p.name,
        sku: p.sku ?? null,
        description: p.description ?? null,
        price: p.price,
        image: p.image ?? null,
        attributes: p.attributes ?? [],
        is_active: !p.is_active,
        default_store_id: p.default_store_id ? String(p.default_store_id) : null,
      });
      setItems((xs) => xs.map((x) => (String(x.id) === String(p.id) ? { ...x, is_active: !p.is_active } : x)));
    } catch (e: any) {
      setError(e?.message ?? 'Toggle gagal');
    }
  }

  function openVariantEditor(p: MasterProduct) {
    setEditing(p);
    const attrs = Array.isArray(p.attributes) && p.attributes.length > 0
      ? p.attributes.map((a) => ({ name: a.name ?? '', value: a.value ?? '' }))
      : [{ name: '', value: '' }];
    setDraftAttrs(attrs);
    setError(null);
  }

  function updateDraft(i: number, field: 'name' | 'value', val: string) {
    setDraftAttrs((xs) => xs.map((a, idx) => (idx === i ? { ...a, [field]: val } : a)));
  }

  function addAttrRow() {
    setDraftAttrs((xs) => [...xs, { name: '', value: '' }]);
  }

  function removeAttrRow(i: number) {
    setDraftAttrs((xs) => xs.filter((_, idx) => idx !== i));
  }

  async function reload() {
    if (!token) return;
    const res = await listMasterProducts(token, {
      search: search || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      store_id: storeId || undefined,
      page,
      limit: 20,
    });
    setItems(res.masterProducts.data);
    setPagination(res.masterProducts as any);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !editing || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    setError(null);
    try {
      const res = await uploadProductImage(token, file);
      setEditing((ed) => (ed ? { ...ed, image: res.uploadProductImage } : ed));
    } catch (err: any) {
      setError(err?.message ?? 'Upload gambar gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus master product ini?')) return;
    if (!token) return;
    try {
      await deleteMasterProduct(token, id);
      setItems((xs) => xs.filter((x) => String(x.id) !== id));
    } catch (e: any) {
      setError(e?.message ?? 'Gagal hapus');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Products</h1>
          <p className="text-sm text-slate-500 mt-1">Catalog induk lintas store. Assign ke store di halaman Stock.</p>
        </div>
        <button
          onClick={() => { setEditing({ name: '', sku: '', price: 0, description: '', is_active: true }); setDraftAttrs([{ name: '', value: '' }]); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-center gap-2 px-3 py-1.5 flex-1 min-w-[200px]">
          <Search size={16} className="text-slate-400" />
          <input
            className="flex-1 outline-none text-sm bg-transparent"
            placeholder="Cari SKU atau nama…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-500 px-1">Harga</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            placeholder="Min"
            className="w-20 rounded-lg border border-slate-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none focus:bg-white"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            placeholder="Max"
            className="w-20 rounded-lg border border-slate-300 bg-neutral-50 px-2 py-1.5 text-sm outline-none focus:bg-white"
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-slate-200" />
        <select
          value={storeId}
          onChange={(e) => { setStoreId(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:bg-white"
        >
          <option value="">Semua Store</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {(minPrice || maxPrice || storeId) && (
          <button
            onClick={() => { setMinPrice(''); setMaxPrice(''); setStoreId(''); setPage(1); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-xs font-semibold"
            title="Reset filter"
            type="button"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold w-16">Gambar</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-4 py-3 font-semibold">Harga</th>
              <th className="px-4 py-3 font-semibold">Assigned Stores</th>
              <th className="px-4 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                <Loader2 className="inline animate-spin mr-2" size={16} /> Memuat…
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Belum ada produk.</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    {p.image ? (
                      <img src={resolveImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImagePlus size={16} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku || '—'}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-3">Rp {(p.price ?? 0).toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {p.store_products && p.store_products.length > 0 ? (
                      p.store_products.map((sp) => (
                        <span key={sp.id} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          {sp.store?.name ?? sp.store_id}
                        </span>
                      ))
                    ) : (
                      <Link href="/owner/web-store/stock" className="text-xs text-blue-600 font-semibold hover:underline">
                        + Assign
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setEditing(p); setDraftAttrs(Array.isArray(p.attributes) && p.attributes.length ? p.attributes.map((a) => ({ name: a.name ?? '', value: a.value ?? '' })) : [{ name: '', value: '' }]); }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    >Edit</button>
                    <button
                      onClick={() => openVariantEditor(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Tag size={13} />
                      Varian
                      {Array.isArray(p.attributes) && p.attributes.length > 0 && (
                        <span className="rounded-md bg-indigo-100 text-indigo-700 px-1.5 text-[10px]">{p.attributes.length}</span>
                      )}
                    </button>
                    <button
                      onClick={() => toggleMasterActive(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${p.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      title={p.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => remove(String(p.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    ><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination && (pagination as any).last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              Halaman {(pagination as any).current_page} dari {(pagination as any).last_page}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-50"
              >Prev</button>
              <button
                disabled={page >= (pagination as any).last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing.id ? 'Edit' : 'Tambah'} Master Product</h3>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <FormField label="SKU">
              <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            </FormField>
            <FormField label="Nama">
              <input className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </FormField>
            <FormField label="Foto Produk">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  {editing.image ? (
                    <img src={resolveImageUrl(editing.image)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-300">
                      <ImagePlus size={22} />
                      <span className="text-[10px] font-medium">Belum ada</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="animate-spin" size={14} /> Mengunggah…
                    </div>
                  )}
                  {editing.image && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image: null })}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >Hapus foto</button>
                  )}
                </div>
              </div>
            </FormField>
            <FormField label="Harga">
              <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </FormField>
            <FormField label="Deskripsi">
              <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3}
                value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </FormField>

            <FormField label="Varian (Definisi)">
              <p className="text-[11px] text-slate-500 mb-2">
                Opsi varian produk — satu sumber, berlaku semua outlet. Mis. Ukuran → 250g / 500g, Kemasan → Biji / Bubuk.
              </p>
              <div className="space-y-2">
                {draftAttrs.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Nama (mis. Ukuran)"
                      value={a.name}
                      onChange={(e) => updateDraft(i, 'name', e.target.value)}
                    />
                    <input
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Nilai (mis. 250g)"
                      value={a.value}
                      onChange={(e) => updateDraft(i, 'value', e.target.value)}
                    />
                    <button
                      onClick={() => removeAttrRow(i)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Hapus baris"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addAttrRow}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
                type="button"
              >
                <Plus size={14} /> Tambah baris varian
              </button>
            </FormField>

            <FormField label="Status">
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">{editing.is_active ? 'Aktif' : 'Nonaktif'}</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1">Produk nonaktif tidak tampil di semua store.</p>
            </FormField>

            {error && <div className="text-sm text-rose-700">{error}</div>}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold">Batal</button>
              <button
                onClick={save}
                disabled={saving || !editing.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold"
              >
                {saving && <Loader2 className="animate-spin" size={14} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
