'use client'

import { useEffect, useState } from 'react'
import { getAllInventory } from '@/graphql/query/inventory/getAllInventory'
import { extractStoreId } from '@/lib/jwt'
import { getStockLogs } from '@/graphql/query/inventory/getLogs'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'
import { importInventoryQuantity } from '@/graphql/mutation/inventory/importInventoryQuantity'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  // Fetch inventory list
  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Token not found')
      const storeId = extractStoreId(token)
      setLoading(true)
      const data = await getAllInventory(token, String(storeId), search)
      setInventory(data)
    } catch (err: any) {
      console.error('Failed to load inventory:', err)
      toast.error('Gagal memuat data stok')
    } finally {
      setLoading(false)
    }
  }

    // Fetch logs untuk produk yang dipilih
    const fetchLogs = async (productId: string) => {
    try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Token not found')

        const logs = await getStockLogs(token, productId)
        setLogs(logs)
    } catch (err) {
        console.error(err)
        toast.error('Gagal memuat log stok')
    }
    }
    useEffect(() => {
        fetchInventory()
    }, [search])

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Inventory & Stock Audit</h1>

        {/* 🔍 Filter + Import Button */}
        <div className="flex mb-4 items-center gap-2">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU atau nama produk..."
                className="border rounded-l-md px-3 py-2 w-full text-sm focus:outline-none"
            />
            <button
                onClick={fetchInventory}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md text-sm"
            >
                Search
            </button>

            <button
                onClick={() => setSelectedProduct({ mode: 'import' })}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm ml-2"
            >
                Bulk Import Quantity
            </button>
        </div>

        {/* 📦 Table Inventory */}
        {loading ? (
          <p className="text-gray-500">Memuat data...</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-center">Current Qty</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
                {inventory.length === 0 ? (
                    <tr>
                    <td colSpan={4} className="text-center text-gray-400 p-4">
                        Tidak ada data stok
                    </td>
                    </tr>
                ) : (
                    inventory.map((item) => (
                    <tr key={item.product_id} className="border-t hover:bg-gray-50">
                        <td className="p-2">{item.product?.sku}</td>
                        <td className="p-2">{item.product?.name}</td>
                        <td className="p-2 text-center font-semibold">
                        {item.current_qty ?? 0}
                        </td>

                        {/* ACTIONS */}
                        <td className="p-2 text-center space-x-3">
                            <button
                                onClick={() => {
                                setSelectedProduct({ ...item, mode: 'logs' })
                                fetchLogs(item.product_id)
                                }}
                                className="text-blue-600 hover:underline text-sm"
                            >
                                View Logs
                            </button>

                            <button
                                onClick={() => setSelectedProduct({ ...item, mode: 'update' })}
                                className="text-green-600 hover:underline text-sm"
                            >
                                Update
                            </button>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>

          </table>
        )}
      </div>

    {/* 📋 Log Detail Drawer */}
    {selectedProduct?.mode === 'logs' && (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
        <div className="bg-white w-[400px] h-full shadow-xl p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
            Log Stok: {selectedProduct.product?.name}
            </h2>
            <button
            onClick={() => setSelectedProduct(null)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
            ×
            </button>
        </div>

        {logs.length === 0 ? (
            <p className="text-gray-400">Belum ada log stok untuk produk ini.</p>
        ) : (
            <table className="w-full text-sm border">
            <thead className="bg-gray-100">
                <tr>
                <th className="p-2 text-center">Change</th>
                <th className="p-2">Source</th>
                <th className="p-2">Note</th>
                <th className="p-2">Time</th>
                </tr>
            </thead>
            <tbody>
                {logs.map((log: any) => (
                <tr key={log.id} className="border-t">
                    <td
                    className={`p-2 text-center font-semibold ${
                        log.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                    >
                    {log.change > 0 ? `+${log.change}` : log.change}
                    </td>
                    <td className="p-2">{log.source || '-'}</td>
                    <td className="p-2">{log.note || '-'}</td>
                    <td className="p-2 text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
        </div>
    </div>
    )}

    {/* Popup Update (tengah layar) */}
    {selectedProduct?.mode === 'update' && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
            Update Stok — {selectedProduct.product?.name}
            </h2>
            <button
            onClick={() => setSelectedProduct(null)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
            ×
            </button>
        </div>

        <div className="mt-2">
            {/* 🔹 Panggil StockCard seperti di EditProductPage */}
            <StockCard productId={Number(selectedProduct.product_id)} />
        </div>
        </div>
    </div>
    )}

    {/* 📤 Popup Import Quantity */}
    {selectedProduct?.mode === 'import' && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg w-[450px] p-6">
        <h2 className="text-lg font-semibold mb-4">Import Quantity (Excel)</h2>
        <p className="text-sm text-gray-500 mb-4">
            Format file: <strong>SKU | Quantity</strong><br />
            Pastikan SKU sudah ada di database produk.
        </p>

        {/* 🔹 Tombol download template */}
        <button
            onClick={async () => {
            try {
                const { downloadInventoryTemplate } = await import('@/utils/downloadInventoryTemplate');
                toast.info('Mengunduh format...');
                await downloadInventoryTemplate();
                toast.success('Format Excel berhasil diunduh');
            } catch (err) {
                console.error(err);
                toast.error('Gagal mengunduh format');
            }
            }}
            className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm mb-3 border"
        >
            📥 Download Format Excel
        </button>

        {/* 🔹 Input file upload */}
        <input
            type="file"
            accept=".xlsx,.xls"
            onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token not found');
                toast.info('Uploading...');
                const { importInventoryQuantity } = await import('@/graphql/mutation/inventory/importInventoryQuantity');
                const res = await importInventoryQuantity(token, file);
                toast.success(`${res.message} ✅ (${res.updated_count} updated, ${res.failed_count} failed)`);
                setSelectedProduct(null);
                fetchInventory(); // refresh tabel
            } catch (err: any) {
                console.error(err);
                toast.error('Gagal import quantity');
            }
            }}
            className="w-full border rounded p-2"
        />

        <div className="flex justify-end mt-4">
            <button
            onClick={() => setSelectedProduct(null)}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
            >
            Tutup
            </button>
        </div>
        </div>
    </div>
    )}



    </div>
  )
}
