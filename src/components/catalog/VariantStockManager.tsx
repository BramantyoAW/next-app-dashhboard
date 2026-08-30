'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveStoreId } from '@/lib/jwt';
import { resolveImageUrl } from '@/lib/imageUtils';
import { getProductVariantStocks } from '@/graphql/query/inventory/getProductVariantStocks';
import { adjustProductVariantStock } from '@/graphql/mutation/inventory/adjustProductVariantStock';
import { uploadProductImage } from '@/graphql/mutation/catalog/uploadProductImage';
import { buildVariantCombinations, formatVariantKey } from '@/lib/variants';
import { OutletSelect } from '@/components/catalog/OutletSelect';
import { toast } from 'sonner';

type Props = {
  productId: number;
  /** Daftar baris atribut (definisi varian) — dipakai utk generate kombinasi. */
  attributes: { name: string; value: string }[];
  /** Outlet target (opsional) — override pilihan outlet aktif. */
  storeId?: number | string | null;
  /** Nama outlet (untuk label). */
  storeName?: string | null;
  /** Dipanggil setelah commit berhasil (mis. refresh outlet di parent). */
  onSaved?: () => void;
  /** Opsi outlet untuk select eksplisit (edit page). Bila kosong, select tak dirender. */
  outlets?: { id: number | string; name: string }[];
  /** Dipanggil saat user memilih outlet di select. */
  onOutletChange?: (id: number | null) => void;
};

type RowState = {
  variant_key: string;
  qty: number;
  /** Nilai qty yang tersimpan di backend (acuan untuk hitung delta saat simpan). */
  baseQty: number;
  image?: string | null;
  /** Nilai image yang tersimpan di backend. */
  baseImage?: string | null;
  price?: number | null;
  /** Nilai price yang tersimpan di backend. */
  basePrice?: number | null;
  loading: boolean;
};

/**
 * Stok + Gambar per KOMBINASI varian.
 * - Produk TANPA varian: komponen ini tidak dipakai; stok produk di StockCard.
 * - Produk DENGAN varian: generate semua kombinasi dari attributes, lalu
 *   baca/tulis qty & image di product_variant_stocks (per store).
 *
 * UX (feedback bug #1): TIDAK auto-commit saat value berubah — semua perubahan
 * qty/harga/gambar dikumpulkan sebagai draft dan di-commit bersamaan lewat
 * tombol "Simpan Perubahan" ke outlet target (prop storeId).
 */
export function VariantStockManager({ productId, attributes, storeId, storeName, onSaved, outlets, onOutletChange }: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  // attributes efektif: pakai props, atau fetch dari getProductById jika props kosong
  const [fetchedAttrs, setFetchedAttrs] = useState<{ name: string; value: string }[]>([]);
  // storeId efektif: dari prop storeId, pilihan outlet aktif, atau fetch myStores → store pertama
  const [resolvedStoreId, setResolvedStoreId] = useState<number | null>(null);
  const [resolvedStoreName, setResolvedStoreName] = useState<string | null>(storeName ?? null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      if (storeId) { setResolvedStoreId(Number(storeId)); return; }
      const fromLocal = getActiveStoreId(token);
      if (fromLocal) { setResolvedStoreId(fromLocal); return; }
      // Fallback: ambil outlet pertama milik user (dashboard tunggal tanpa pilihan).
      try {
        const { myStoresService } = await import('@/graphql/query/myStores');
        const res = await myStoresService(token);
        const first = res.myStores?.[0];
        if (first) {
          setResolvedStoreId(first.id);
          setResolvedStoreName(first.name);
          localStorage.setItem('activeStoreId', String(first.id));
        }
      } catch { /* ignore */ }
    })();
  }, [storeId]);

  const effectiveAttrs = attributes.length > 0 ? attributes : fetchedAttrs;
  const combinations = useMemo(() => buildVariantCombinations(effectiveAttrs), [effectiveAttrs]);

  // Jika props attributes kosong (mis. dari inventory), ambil dari backend.
  useEffect(() => {
    if (attributes.length > 0) return;
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const { graphqlClient } = await import('@/graphql/graphqlClient');
        const { GET_PRODUCT_BY_ID } = await import('@/graphql/query/catalog/getProductById');
        graphqlClient.setHeader('Authorization', `Bearer ${token}`);
        const res: any = await graphqlClient.request(GET_PRODUCT_BY_ID, { id: String(productId) });
        const p = res?.getProductById;
        setFetchedAttrs(
          Array.isArray(p?.attributes)
            ? p.attributes.map((a: any) => ({ name: a?.name ?? '', value: a?.value ?? '' }))
            : []
        );
      } catch { /* ignore */ }
    })();
  }, [productId, attributes]);

  useEffect(() => {
    if (combinations.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      const token = localStorage.getItem('token');
      const sid = resolvedStoreId;
      if (!token || !sid) {
        setLoading(false);
        return;
      }

      try {
        const res = await getProductVariantStocks(token, sid, productId);
        const map: Record<string, RowState> = {};
        for (const c of combinations) {
          const found = res.productVariantStocks?.find(s => s.variant_key === c);
          const qty = found?.qty ?? 0;
          map[c] = {
            variant_key: c,
            qty,
            baseQty: qty,
            image: found?.image ?? null,
            baseImage: found?.image ?? null,
            price: found?.price != null ? Number(found.price) : null,
            basePrice: found?.price != null ? Number(found.price) : null,
            loading: false,
          };
        }
        setRows(map);
      } catch (e) {
        toast.error('Gagal memuat stok varian');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, combinations, resolvedStoreId]);

  /** Update draft qty (lokal, belum commit). */
  const setDraftQty = useCallback((key: string, qty: number) => {
    setRows(prev => (prev[key] ? { ...prev, [key]: { ...prev[key], qty: Math.max(0, qty) } } : prev));
  }, []);

  /** Update draft price (lokal, belum commit). */
  const setDraftPrice = useCallback((key: string, price: number | null) => {
    setRows(prev => (prev[key] ? { ...prev, [key]: { ...prev[key], price } } : prev));
  }, []);

  /** Update draft image URL (lokal, belum commit). */
  const setDraftImage = useCallback((key: string, image: string | null) => {
    setRows(prev => (prev[key] ? { ...prev, [key]: { ...prev[key], image } } : prev));
  }, []);

  /**
   * Commit SEMUA perubahan sekaligus ke outlet target. Per baris:
   * - qty: delta = draft - baseQty (0 jika tak berubah).
   * - price: kirim bila berubah dari base (null = fallback harga produk).
   * - image: kirim bila berubah dari base (null = hapus).
   */
  const handleSave = useCallback(async () => {
    const token = localStorage.getItem('token');
    const sid = resolvedStoreId;
    if (!token || !sid) {
      toast.error('Tidak ada outlet aktif');
      return;
    }

    const dirty = Object.values(rows).filter(r => {
      const qtyChanged = r.qty !== r.baseQty;
      const priceChanged = (r.price ?? null) !== (r.basePrice ?? null);
      const imageChanged = (r.image ?? null) !== (r.baseImage ?? null);
      return qtyChanged || priceChanged || imageChanged;
    });

    if (dirty.length === 0) {
      toast.info('Tidak ada perubahan untuk disimpan');
      return;
    }

    setSaving(true);
    let ok = 0;
    try {
      for (const r of dirty) {
        const delta = r.qty - r.baseQty;
        try {
          const res = await adjustProductVariantStock(token, {
            masterProductId: productId,
            storeId: sid,
            variantKey: r.variant_key,
            change: delta,
            price: r.price,
            image: r.image,
          });
          const saved = res.adjustProductVariantStock;
          setRows(prev => ({
            ...prev,
            [r.variant_key]: {
              ...prev[r.variant_key],
              qty: saved.qty ?? r.qty,
              baseQty: saved.qty ?? r.qty,
              price: saved.price != null ? Number(saved.price) : null,
              basePrice: saved.price != null ? Number(saved.price) : null,
              image: saved.image ?? null,
              baseImage: saved.image ?? null,
              loading: false,
            },
          }));
          ok++;
        } catch (e: any) {
          const msg = e?.response?.errors?.[0]?.message || e?.message || 'Gagal simpan';
          toast.error(`Gagal simpan ${formatVariantKey(r.variant_key)}: ${msg}`);
        }
      }
      if (ok > 0) {
        toast.success(`Stok varian tersimpan (${ok} baris)`);
        if (onSaved) onSaved();
      }
    } finally {
      setSaving(false);
    }
  }, [rows, resolvedStoreId, productId, onSaved]);

  const handleImageUpload = useCallback(async (key: string, file: File) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUploadingKey(key);
    try {
      const url = await uploadProductImage(token, file);
      setDraftImage(key, url);
      toast.success('Gambar ter-upload — klik Simpan Perubahan untuk menyimpan');
    } catch (e) {
      toast.error('Upload gambar varian gagal');
    } finally {
      setUploadingKey(null);
    }
  }, [setDraftImage]);

  if (combinations.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">Stok, Harga & Gambar per Varian</h2>
      <p className="text-xs text-gray-500 mb-3">
        Setiap kombinasi varian punya stok, harga & gambar sendiri. Harga kosong = pakai harga produk.
      </p>
      {/* Select outlet tujuan EDIT STOK (terpisah dari checkbox Merchant/Outlet) */}
      {outlets && outlets.length > 0 && (
        <OutletSelect
          outlets={outlets}
          value={resolvedStoreId}
          onChange={id => {
            if (onOutletChange) onOutletChange(id);
            setResolvedStoreId(id);
            const o = outlets.find(x => Number(x.id) === Number(id));
            setResolvedStoreName(o?.name ?? null);
          }}
          label="Edit Stok di Outlet"
        />
      )}
      {resolvedStoreId && (
        <p className="text-xs font-bold text-indigo-600 mb-3">
          Outlet: {resolvedStoreName ?? `#${resolvedStoreId}`}
        </p>
      )}

      {loading ? (
        <div className="p-6 text-sm text-gray-400">Memuat kombinasi varian…</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-3">Varian</th>
                <th className="p-3 w-44">Harga</th>
                <th className="p-3 w-36">Stok</th>
                <th className="p-3 w-64">Gambar</th>
              </tr>
            </thead>
            <tbody>
              {combinations.map(key => {
                const row = rows[key];
                const isUploading = uploadingKey === key;
                const dirty = row && (
                  row.qty !== row.baseQty ||
                  (row.price ?? null) !== (row.basePrice ?? null) ||
                  (row.image ?? null) !== (row.baseImage ?? null)
                );
                return (
                  <tr key={key} className={`border-b last:border-0 ${dirty ? 'bg-amber-50/60' : ''}`}>
                    <td className="p-3 font-semibold text-gray-700">
                      {formatVariantKey(key)}
                      {dirty && <span className="ml-1.5 text-[10px] font-bold text-amber-600">• belum disimpan</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Rp</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Harga produk"
                          value={row?.price != null ? String(row.price) : ''}
                          onChange={e => {
                            const v = e.target.value.trim();
                            const num = v === '' ? null : Number(v);
                            if (num !== null && Number.isNaN(num)) return;
                            setDraftPrice(key, num);
                          }}
                          className="border rounded px-2 py-1.5 text-xs w-full"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraftQty(key, (row?.qty ?? 0) - 1)}
                          disabled={row?.loading || (row?.qty ?? 0) <= 0}
                          className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition font-bold"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={row?.qty ?? 0}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '');
                            setDraftQty(key, v === '' ? 0 : Number(v));
                          }}
                          className="w-16 text-center font-bold tabular-nums border border-gray-200 rounded-lg px-1 py-1.5 focus:outline-none focus:border-blue-400"
                          aria-label={`Stok varian ${formatVariantKey(key)}`}
                        />
                        <button
                          type="button"
                          onClick={() => setDraftQty(key, (row?.qty ?? 0) + 1)}
                          disabled={row?.loading}
                          className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {row?.image ? (
                          <img
                            src={resolveImageUrl(row.image)}
                            alt={key}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[9px]">img</div>
                        )}
                        <input
                          type="text"
                          placeholder="URL gambar varian"
                          value={row?.image ?? ''}
                          onChange={e => setDraftImage(key, e.target.value.trim() || null)}
                          className="border rounded px-2 py-1.5 text-xs w-full"
                        />
                        <label className="text-[11px] text-blue-600 hover:underline cursor-pointer whitespace-nowrap">
                          {isUploading ? '…' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(key, f);
                            }}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 border-t flex items-center justify-end gap-2">
            <span className="text-[11px] text-gray-400 mr-auto">
              Perubahan baru tersimpan setelah klik tombol.
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
