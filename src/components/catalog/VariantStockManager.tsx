'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveStoreId } from '@/lib/jwt';
import { resolveImageUrl } from '@/lib/imageUtils';
import { getProductVariantStocks } from '@/graphql/query/inventory/getProductVariantStocks';
import { adjustProductVariantStock } from '@/graphql/mutation/inventory/adjustProductVariantStock';
import { uploadProductImage } from '@/graphql/mutation/catalog/uploadProductImage';
import { buildVariantCombinations, formatVariantKey } from '@/lib/variants';
import { toast } from 'sonner';

type Props = {
  productId: number;
  /** Daftar baris atribut (definisi varian) — dipakai utk generate kombinasi. */
  attributes: { name: string; value: string }[];
};

type RowState = {
  variant_key: string;
  qty: number;
  /** Nilai qty yang tersimpan di backend (acuan untuk hitung delta saat blur). */
  baseQty: number;
  image?: string | null;
  price?: number | null;
  loading: boolean;
};

/**
 * Stok + Gambar per KOMBINASI varian.
 * - Produk TANPA varian: komponen ini tidak dipakai; stok produk di StockCard.
 * - Produk DENGAN varian: generate semua kombinasi dari attributes, lalu
 *   baca/tulis qty & image di product_variant_stocks (per store).
 */
export function VariantStockManager({ productId, attributes }: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  // attributes efektif: pakai props, atau fetch dari getProductById jika props kosong
  const [fetchedAttrs, setFetchedAttrs] = useState<{ name: string; value: string }[]>([]);
  // storeId efektif: dari pilihan outlet aktif, atau fetch myStores → store pertama
  const [resolvedStoreId, setResolvedStoreId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const fromLocal = getActiveStoreId(token);
      if (fromLocal) { setResolvedStoreId(fromLocal); return; }
      // Fallback: ambil outlet pertama milik user (dashboard tunggal tanpa pilihan).
      try {
        const { myStoresService } = await import('@/graphql/query/myStores');
        const res = await myStoresService(token);
        const first = res.myStores?.[0];
        if (first) {
          setResolvedStoreId(first.id);
          localStorage.setItem('activeStoreId', String(first.id));
        }
      } catch { /* ignore */ }
    })();
  }, []);

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
      const storeId = resolvedStoreId;
      if (!token || !storeId) {
        setLoading(false);
        return;
      }

      try {
        const res = await getProductVariantStocks(token, storeId, productId);
        const map: Record<string, RowState> = {};
        for (const c of combinations) {
          const found = res.productVariantStocks?.find(s => s.variant_key === c);
          const qty = found?.qty ?? 0;
          map[c] = {
            variant_key: c,
            qty,
            baseQty: qty,
            image: found?.image ?? null,
            price: found?.price ?? null,
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

  const setQty = useCallback((key: string, change: number) => {
    (async () => {
      const token = localStorage.getItem('token');
      const storeId = resolvedStoreId;
      if (!token || !storeId) return;
      setRows(prev => ({ ...prev, [key]: { ...prev[key], loading: true } }));
      try {
        const res = await adjustProductVariantStock(token, {
          masterProductId: productId,
          storeId,
          variantKey: key,
          change,
          source: 'manual-adjust',
        });
        const newQty = res.adjustProductVariantStock.qty;
        setRows(prev => ({ ...prev, [key]: { ...prev[key], qty: newQty, baseQty: newQty, loading: false } }));
        toast.success(`Stok varian diupdate (${formatVariantKey(key)})`);
      } catch (e: any) {
        setRows(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
        const msg = e?.response?.errors?.[0]?.message || e?.message || 'Gagal update stok varian';
        toast.error(msg);
      }
    })();
  }, [productId, resolvedStoreId]);

  const setPrice = useCallback((key: string, price: number | null) => {
    (async () => {
      const token = localStorage.getItem('token');
      const storeId = resolvedStoreId;
      if (!token || !storeId) return;
      try {
        const res = await adjustProductVariantStock(token, {
          masterProductId: productId,
          storeId,
          variantKey: key,
          change: 0,
          price,
        });
        setRows(prev => ({ ...prev, [key]: { ...prev[key], price: res.adjustProductVariantStock.price ?? prev[key].price } }));
        toast.success(`Harga varian tersimpan (${formatVariantKey(key)})`);
      } catch (e) {
        toast.error('Gagal simpan harga varian');
      }
    })();
  }, [productId, resolvedStoreId]);

  const setImage = useCallback((key: string, image: string) => {
    (async () => {
      const token = localStorage.getItem('token');
      const storeId = resolvedStoreId;
      if (!token || !storeId) return;
      try {
        const res = await adjustProductVariantStock(token, {
          masterProductId: productId,
          storeId,
          variantKey: key,
          change: 0,
          image,
        });
        // Hanya update image — JANGAN sentuh qty/price dari response (mutation
        // change:0 bisa punya qty stale bila berbarengan dgn update stok).
        setRows(prev => ({ ...prev, [key]: { ...prev[key], image: res.adjustProductVariantStock.image ?? prev[key].image } }));
        toast.success('Gambar varian tersimpan');
      } catch (e) {
        toast.error('Gagal simpan gambar varian');
      }
    })();
  }, [productId, resolvedStoreId]);

  const handleImageUpload = useCallback(async (key: string, file: File) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUploadingKey(key);
    try {
      const url = await uploadProductImage(token, file);
      await setImage(key, url);
    } catch (e) {
      toast.error('Upload gambar varian gagal');
    } finally {
      setUploadingKey(null);
    }
  }, [setImage]);

  if (combinations.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">Stok, Harga & Gambar per Varian</h2>
      <p className="text-xs text-gray-500 mb-3">
        Setiap kombinasi varian punya stok, harga & gambar sendiri. Harga kosong = pakai harga produk. Produk tanpa varian dikelola di halaman Inventory.
      </p>

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
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="p-3 font-semibold text-gray-700">{formatVariantKey(key)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Rp</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Harga produk"
                          defaultValue={row?.price != null ? String(row.price) : ''}
                          onBlur={e => {
                            const v = e.target.value.trim();
                            const num = v === '' ? null : Number(v);
                            if (num !== null && Number.isNaN(num)) return;
                            if (num !== row?.price) setPrice(key, num);
                          }}
                          className="border rounded px-2 py-1.5 text-xs w-full"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQty(key, -1)}
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
                            // Hanya izinkan angka
                            const v = e.target.value.replace(/\D/g, '');
                            setRows(prev => ({ ...prev, [key]: { ...prev[key], qty: v === '' ? 0 : Number(v) } }));
                          }}
                          onBlur={e => {
                            const target = Number(e.target.value);
                            // Delta dihitung dari baseQty (nilai tersimpan backend),
                            // bukan qty lokal yang sudah berubah di onChange.
                            const diff = target - (row?.baseQty ?? 0);
                            if (diff !== 0) setQty(key, diff);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="w-16 text-center font-bold tabular-nums border border-gray-200 rounded-lg px-1 py-1.5 focus:outline-none focus:border-blue-400"
                          aria-label={`Stok varian ${formatVariantKey(key)}`}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(key, 1)}
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
                          defaultValue={row?.image ?? ''}
                          onBlur={e => {
                            const v = e.target.value.trim();
                            if (v && v !== row?.image) setImage(key, v);
                          }}
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
        </div>
      )}
    </div>
  );
}
