'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMasterProducts, listWebStoreCategories, getWebStoreByOwner } from '@/graphql/query/webstore';
import { upsertMasterProduct, deleteMasterProduct, uploadProductImage, assignProductCategories } from '@/graphql/mutation/webstore';
import { myStoresService } from '@/graphql/query/myStores';
import type { MasterProduct, Paginated, ProductAttribute } from '@/graphql/query/webstore';
import { Plus, Trash2, Loader2, Search, AlertCircle, X, ImagePlus, RotateCcw, Tag } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUtils';
import { decodeJwt } from '@/lib/jwt';

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
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    myStoresService(token)
      .then((res) => setStores((res.myStores ?? []).map((s: any) => ({ id: String(s.id), name: s.name }))))
      .catch(() => {});
    // Load web store categories once for the assignment picker.
    (async () => {
      try {
        const payload = decodeJwt(token);
        const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
        if (!ownerId) return;
        const ws = await getWebStoreByOwner(ownerId, token);
        if (ws.webStoreByOwner?.id) {
          const res = await listWebStoreCategories(token, String(ws.webStoreByOwner.id));
          setCategories((res.webStoreCategories ?? []).filter((c: any) => c.is_active !== false).map((c: any) => ({ id: String(c.id), name: c.name })));
        }
      } catch { /* picker stays empty; assignment is optional */ }
    })();
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
      const saved = await upsertMasterProduct(token, {
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
      // Apply category assignment after the product itself is persisted.
      // upsert returns a MasterProduct; categories hang off its store product
      // rows (any owner outlet row works — they share the same assignment).
      const mp = saved?.upsertMasterProduct;
      const storeProductId = String(
        mp?.store_products?.find((sp: any) => sp.is_active !== false)?.id
          ?? mp?.store_products?.[0]?.id
          ?? ''
      );
      if (storeProductId) {
        await assignProductCategories(token, storeProductId, draftCategoryIds);
      }
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
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Master Products</h1>
          <p className="ds-small mt-1">Catalog induk lintas store. Assign ke store di halaman Stock.</p>
        </div>
        <button
          onClick={() => { setEditing({ name: '', sku: '', price: 0, description: '', is_active: true }); setDraftAttrs([{ name: '', value: '' }]); setDraftCategoryIds([]); }}
          className="ds-btn"
          data-variant="primary"
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div className="ds-card flex flex-wrap items-center gap-2 p-2">
        <div className="relative flex items-center flex-1 min-w-[200px]">
          <Search size={16} className="ds-icon-muted absolute left-3 pointer-events-none" />
          <input
            className="ds-input w-full"
            style={{ paddingLeft: 36 }}
            placeholder="Cari SKU atau nama…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="hidden sm:block h-6 w-px" style={{ background: 'var(--ds-border)' }} />
        <div className="flex items-center gap-1 text-sm">
          <span className="ds-caption px-1">Harga</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            placeholder="Min"
            className="ds-input"
            style={{ width: 80 }}
          />
          <span className="ds-caption">–</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            placeholder="Max"
            className="ds-input"
            style={{ width: 80 }}
          />
        </div>
        <div className="hidden sm:block h-6 w-px" style={{ background: 'var(--ds-border)' }} />
        <select
          value={storeId}
          onChange={(e) => { setStoreId(e.target.value); setPage(1); }}
          className="ds-select"
          style={{ width: 'auto' }}
        >
          <option value="">Semua Store</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {(minPrice || maxPrice || storeId) && (
          <button
            onClick={() => { setMinPrice(''); setMaxPrice(''); setStoreId(''); setPage(1); }}
            className="ds-btn-sm"
            data-tone="neutral"
            title="Reset filter"
            type="button"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {error && (
        <div className="ds-alert" data-tone="bad">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="ds-card overflow-hidden">
        <div className="ds-table-wrap" style={{ border: 0, borderRadius: 0, marginTop: 0 }}>
          <table className="ds-table w-full">
            <thead className="ds-thead">
              <tr>
                <th className="w-16">Gambar</th>
                <th>SKU</th>
                <th>Nama</th>
                <th>Harga</th>
                <th>Assigned Stores</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center ds-small" style={{ paddingTop: 48, paddingBottom: 48 }}>
                <Loader2 className="inline animate-spin mr-2" size={16} /> Memuat…
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center ds-caption" style={{ paddingTop: 48, paddingBottom: 48 }}>Belum ada produk.</td></tr>
            ) : items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="w-10 h-10 rounded-lg overflow-hidden" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}>
                    {p.image ? (
                      <img src={resolveImageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center ds-icon-muted">
                        <ImagePlus size={16} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="ds-mono">{p.sku || '—'}</td>
                <td className="font-semibold">{p.name}</td>
                <td className="ds-num">Rp {(p.price ?? 0).toLocaleString('id-ID')}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {p.store_products && p.store_products.length > 0 ? (
                      p.store_products.map((sp) => (
                        <span key={sp.id} className="ds-badge" data-tone="ok">
                          {sp.store?.name ?? sp.store_id}
                        </span>
                      ))
                    ) : (
                      <Link href="/owner/web-store/stock" className="ds-link text-xs">
                        + Assign
                      </Link>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setEditing(p); setDraftAttrs(Array.isArray(p.attributes) && p.attributes.length ? p.attributes.map((a) => ({ name: a.name ?? '', value: a.value ?? '' })) : [{ name: '', value: '' }]); setDraftCategoryIds((p.categories ?? []).map((c: any) => String(c.id))); }}
                      className="ds-btn-sm"
                      data-tone="neutral"
                    >Edit</button>
                    <button
                      onClick={() => openVariantEditor(p)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                    >
                      <Tag size={13} />
                      Varian
                      {Array.isArray(p.attributes) && p.attributes.length > 0 && (
                        <span className="ds-chip">{p.attributes.length}</span>
                      )}
                    </button>
                    <button
                      onClick={() => toggleMasterActive(p)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                      style={p.is_active ? { color: '#15803d' } : undefined}
                      title={p.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => remove(String(p.id))}
                      className="ds-btn-sm"
                      data-tone="neutral"
                      style={{ color: 'var(--ds-danger)' }}
                    ><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {pagination && (pagination as any).last_page > 1 && (
          <div className="ds-divider-top flex items-center justify-between text-sm">
            <span className="ds-small">
              Halaman {(pagination as any).current_page} dari {(pagination as any).last_page}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ds-btn-sm"
                data-tone="neutral"
              >Prev</button>
              <button
                disabled={page >= (pagination as any).last_page}
                onClick={() => setPage((p) => p + 1)}
                className="ds-btn-sm"
                data-tone="neutral"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'color-mix(in srgb, var(--ds-fg) 40%, transparent)' }}>
          <div className="ds-card w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="ds-h1">{editing.id ? 'Edit' : 'Tambah'} Master Product</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-[var(--ds-surface-2)]"><X size={18} /></button>
            </div>
            <FormField label="SKU">
              <input className="ds-input"
                value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            </FormField>
            <FormField label="Nama">
              <input className="ds-input"
                value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </FormField>
            <FormField label="Foto Produk">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}>
                  {editing.image ? (
                    <img src={resolveImageUrl(editing.image)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 ds-icon-muted">
                      <ImagePlus size={22} />
                      <span className="ds-caption">Belum ada</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={uploading}
                    className="block w-full ds-small file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--ds-surface-2)] file:text-[var(--ds-primary)] hover:file:bg-[var(--ds-surface-2)] disabled:opacity-50"
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 ds-caption">
                      <Loader2 className="animate-spin" size={14} /> Mengunggah…
                    </div>
                  )}
                  {editing.image && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image: null })}
                      className="ds-link-danger text-xs"
                    >Hapus foto</button>
                  )}
                </div>
              </div>
            </FormField>
            <FormField label="Harga">
              <input type="number" className="ds-input"
                value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </FormField>
            <FormField label="Deskripsi">
              <textarea className="ds-textarea" rows={3}
                value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </FormField>

            <FormField label="Varian (Definisi)">
              <p className="ds-hint mb-2">
                Opsi varian produk — satu sumber, berlaku semua outlet. Mis. Ukuran → 250g / 500g, Kemasan → Biji / Bubuk.
              </p>
              <div className="space-y-2">
                {draftAttrs.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 ds-input"
                      placeholder="Nama (mis. Ukuran)"
                      value={a.name}
                      onChange={(e) => updateDraft(i, 'name', e.target.value)}
                    />
                    <input
                      className="flex-1 ds-input"
                      placeholder="Nilai (mis. 250g)"
                      value={a.value}
                      onChange={(e) => updateDraft(i, 'value', e.target.value)}
                    />
                    <button
                      onClick={() => removeAttrRow(i)}
                      className="ds-btn-sm"
                      data-tone="neutral"
                      style={{ color: 'var(--ds-danger)' }}
                      aria-label="Hapus baris"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addAttrRow}
                className="mt-2 ds-btn-sm"
                data-tone="neutral"
                type="button"
              >
                <Plus size={14} /> Tambah baris varian
              </button>
            </FormField>

            <FormField label="Kategori">
              {categories.length === 0 ? (
                <p className="ds-caption">
                  Belum ada kategori. <Link href="/owner/web-store/categories" className="ds-link">Buat kategori →</Link>
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto ds-well space-y-1.5">
                  {categories.map((c) => (
                    <label key={c.id} className="ds-check-label flex items-center gap-2.5 cursor-pointer hover:bg-[var(--ds-surface)] rounded-lg px-2 py-1.5">
                      <input
                        type="checkbox"
                        className="ds-switch w-4 h-4"
                        checked={draftCategoryIds.includes(c.id)}
                        onChange={(e) => setDraftCategoryIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
              <p className="ds-hint">Kategori menentukan navigasi produk di storefront.</p>
            </FormField>

            <FormField label="Status">
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="ds-switch w-4 h-4"
                />
                <span className="ds-body">{editing.is_active ? 'Aktif' : 'Nonaktif'}</span>
              </label>
              <p className="ds-hint">Produk nonaktif tidak tampil di semua store.</p>
            </FormField>

            {error && <div className="ds-alert" data-tone="bad">{error}</div>}
            <div className="ds-divider-top flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="ds-btn" data-variant="secondary">Batal</button>
              <button
                onClick={save}
                disabled={saving || !editing.name}
                className="ds-btn"
                data-variant="primary"
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
      <label className="ds-label">{label}</label>
      {children}
    </div>
  );
}
