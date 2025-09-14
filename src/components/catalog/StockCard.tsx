'use client';

import React, { useEffect, useState } from 'react';
import { extractStoreId } from '@/lib/jwt';
import { getProductStock } from '@/graphql/query/inventory/getProductStock';
import { adjustProductStock } from '@/graphql/mutation/inventory/adjustProductStock';
import { toast } from 'sonner';

// 🔹 Definisikan type log
type StockLog = {
  change: number;
  source: string;
  note?: string | null;
  created_at: string;
};

export function StockCard({ productId }: { productId: number }) {
  const [qty, setQty] = useState<number>(0);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ change: 0, source: 'restock', note: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      const storeId = extractStoreId(token);
      if (!token || !storeId) return;

      try {
        const res = await getProductStock(token, productId);
        setQty(res.productStock?.current_qty ?? 0);

        const apiLogs: StockLog[] = (res.productStock?.logs ?? []).map((l: any) => ({
          change: l.change,
          source: l.source,
          note: l.note ?? null,
          created_at: l.created_at,
        }));
        setLogs(apiLogs);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  const submitAdjust = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setOpen(false);

    try {
      const res = await adjustProductStock(token, {
        pid: productId,
        chg: Number(form.change),
        src: form.source,
        note: form.note || undefined,
      });
      setQty(res.adjustProductStock.current_qty);

      // prepend log baru
      const newLog: StockLog = {
        change: form.change,
        source: form.source,
        note: form.note || null,
        created_at: new Date().toISOString(),
      };
      setLogs(prev => [newLog, ...prev]);

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

      {/* Logs */}
      <h4 className="mt-6 font-semibold">Stock History</h4>
      <div className="mt-2 border rounded-lg max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Change</th>
              <th className="p-2 text-left">Source</th>
              <th className="p-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                <td
                  className={`p-2 font-medium ${
                    l.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {l.change >= 0 ? `+${l.change}` : l.change}
                </td>
                <td className="p-2">{l.source}</td>
                <td className="p-2">{l.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
