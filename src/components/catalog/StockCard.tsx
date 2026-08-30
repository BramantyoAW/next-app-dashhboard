'use client';

import React, { useEffect, useState } from 'react';
import { getActiveStoreId } from '@/lib/jwt';
import { getProductStock } from '@/graphql/query/inventory/getProductStock';
import { adjustProductStock } from '@/graphql/mutation/inventory/adjustProductStock';
import { toast } from 'sonner';

/**
 * Stok PRODUK level produk (bukan per varian) + tombol Adjust.
 * Riwayat/perubahan stok ditampilkan di component terpisah `StockHistory`
 * (gabungan produk + varian) — supaya tidak dobel.
 * `storeId` opsional: bila diberikan, adjust di outlet itu (per-outlet);
 * fallback ke store aktif.
 */
export function StockCard({ productId, onSuccess, storeId }: { productId: number, onSuccess?: () => void, storeId?: number | string }) {
  const [qty, setQty] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ change: 0, source: 'restock', note: '' });
  const [loading, setLoading] = useState(true);

  const effectiveStoreId = () => {
    if (storeId) return String(storeId);
    const token = localStorage.getItem('token');
    return getActiveStoreId(token);
  };

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      const sid = effectiveStoreId();
      if (!token || !sid) {
        setLoading(false);
        return;
      }

      try {
        const res = await getProductStock(token, productId, sid);
        setQty(res.productStock?.current_qty ?? 0);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeId]);

  const submitAdjust = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const sid = effectiveStoreId();
    setOpen(false);

    try {
      const res = await adjustProductStock(token, {
        pid: productId,
        chg: Number(form.change),
        src: form.source,
        note: form.note || undefined,
        storeId: sid,
      });
      setQty(res.adjustProductStock.current_qty);
      if (onSuccess) onSuccess();
      toast.success('Stock updated');
    } catch (e) {
      toast.error('Gagal update stok');
    }
  };

  if (loading) {
    return <div className="p-4 bg-white rounded-xl shadow">Loading stock…</div>;
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      {/* Header qty + button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Current Stock</div>
          <div className="text-3xl font-bold">{qty}</div>
        </div>
        <button
          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setOpen(true)}
        >
          Adjust
        </button>
      </div>

      {/* Modal adjust */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Adjust Stock</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Change (+/-)</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={form.change}
                  onChange={e => setForm({ ...form, change: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Source</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                >
                  <option value="restock">restock</option>
                  <option value="correction">correction</option>
                  <option value="adjustment">adjustment</option>
                  <option value="sale">sale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Note</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-100" onClick={() => setOpen(false)}>
                Batal
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={submitAdjust}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
