'use client';

import React, { useEffect, useState } from 'react';
import { getActiveStoreId } from '@/lib/jwt';
import { getProductStock } from '@/graphql/query/inventory/getProductStock';
import { getProductVariantStocks } from '@/graphql/query/inventory/getProductVariantStocks';
import { formatVariantKey } from '@/lib/variants';

type LogEntry = {
  id: string;
  type: 'product' | 'variant';
  variant_key?: string;
  change: number;
  source: string;
  note?: string | null;
  created_at: string;
};

/**
 * Stock History GABUNGAN: riwayat stok produk (product_stock_logs) + riwayat
 * stok per varian (product_variant_stock_logs), diurutkan terbaru di atas.
 * Dipakai di detail produk, di bawah section "Stok & Gambar per Varian".
 */
export function StockHistory({ productId }: { productId: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // storeId efektif: dari pilihan outlet aktif, atau fallback outlet pertama user.
  const [storeId, setStoreId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const fromLocal = getActiveStoreId(token);
      if (fromLocal) { setStoreId(fromLocal); return; }
      try {
        const { myStoresService } = await import('@/graphql/query/myStores');
        const res = await myStoresService(token);
        const first = res.myStores?.[0];
        if (first) {
          setStoreId(first.id);
          localStorage.setItem('activeStoreId', String(first.id));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!storeId) {
        setLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const all: LogEntry[] = [];
      try {
        const res = await getProductStock(token, productId, storeId);
        const pLogs = (res.productStock?.logs ?? []).map((l, i) => ({
          id: `p-${i}`,
          type: 'product' as const,
          change: l.change,
          source: l.source,
          note: l.note ?? null,
          created_at: l.created_at,
        }));
        all.push(...pLogs);
      } catch { /* ignore */ }

      try {
        const vRes = await getProductVariantStocks(token, storeId, productId);
        for (const vs of vRes.productVariantStocks ?? []) {
          (vs.logs ?? []).forEach((l, li) => {
            all.push({
              id: `v-${vs.id}-${li}-${l.created_at}`,
              type: 'variant',
              variant_key: vs.variant_key,
              change: l.change,
              source: l.source ?? 'manual-adjust',
              note: l.note ?? null,
              created_at: l.created_at,
            });
          });
        }
      } catch { /* ignore */ }

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(all);
      setLoading(false);
    })();
  }, [productId, storeId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">Memuat riwayat stok…</div>;
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">Stock History</h2>
      <p className="text-xs text-gray-500 mb-3">
        Riwayat perubahan stok produk &amp; tiap varian (terbaru di atas).
      </p>
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border p-6 text-sm text-gray-400 text-center">
          Belum ada riwayat stok.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Perubahan</th>
                  <th className="p-3">Sumber</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap text-gray-500">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {l.type === 'variant' ? (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {formatVariantKey(l.variant_key ?? '')}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                          Produk
                        </span>
                      )}
                    </td>
                    <td className={`p-3 font-bold tabular-nums ${l.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {l.change >= 0 ? `+${l.change}` : l.change}
                    </td>
                    <td className="p-3 text-gray-600">{l.source}</td>
                    <td className="p-3 text-gray-400">{l.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
