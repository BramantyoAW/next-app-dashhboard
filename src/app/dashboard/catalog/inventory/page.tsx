'use client'

import { useEffect, useState } from 'react'
import { getAllInventory } from '@/graphql/query/inventory/getAllInventory'
import { extractStoreId } from '@/lib/jwt'
import { getStockLogs } from '@/graphql/query/inventory/getLogs'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'
import {
  Package,
  Search,
  Upload,
  RefreshCw,
  History,
  X,
  FileDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MinusCircle
} from 'lucide-react'

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
    <div className="p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Package className="text-indigo-600" size={28} />
              Inventory & Stock Audit
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Manage your product stock levels and track adjustments</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProduct({ mode: 'import' })}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Upload size={16} />
              Bulk Import
            </button>
          </div>
        </div>

        {/* Search & Stats Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU or Product Name..."
                className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
            <button
              onClick={fetchInventory}
              className="h-12 px-8 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Product Information</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">SKU Code</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">Quantity</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-slate-400 font-bold tracking-tight">Fetching inventory data...</p>
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="text-slate-200" size={48} />
                        <p className="text-slate-400 font-bold tracking-tight text-lg">No inventory data found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    return (
                      <tr key={item.product_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-900">{item.product?.name}</div>
                          <div className="text-xs text-slate-400 font-medium lowercase">Item ID: {item.product_id}</div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-xs text-slate-600 font-bold">
                            {item.product?.sku || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`text-base font-black ${item.current_qty <= 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {item.current_qty ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct({ ...item, mode: 'logs' })
                                fetchLogs(item.product_id)
                              }}
                              className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all title-tooltip"
                              title="View History"
                            >
                              <History size={18} />
                            </button>
                            <button
                              onClick={() => setSelectedProduct({ ...item, mode: 'update' })}
                              className="px-4 py-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 📋 Log Detail Slide-over Drawer */}
      {selectedProduct?.mode === 'logs' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-[100] transition-all">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="text-indigo-600" size={24} />
                  Stock Audit Trail
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{selectedProduct.product?.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <History className="text-slate-200" size={32} />
                  </div>
                  <p className="text-slate-400 font-bold text-sm tracking-tight">No stock adjustments recorded yet.</p>
                </div>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${
                      log.change >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{log.source || 'Manual Edit'}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mt-1 truncate">{log.note || 'No description provided'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popup Update Modal */}
      {selectedProduct?.mode === 'update' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Stock Correction</h2>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">{selectedProduct.product?.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <StockCard productId={Number(selectedProduct.product_id)} onSuccess={fetchInventory} />
            </div>
          </div>
        </div>
      )}

      {/* 📤 Bulk Import Modal */}
      {selectedProduct?.mode === 'import' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Bulk Quantity Update</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-rose-500"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-3">
                <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Upload an Excel file with columns: <span className="font-bold text-slate-900 underline decoration-indigo-200">SKU</span> and <span className="font-bold text-slate-900 underline decoration-indigo-200">Quantity</span>. 
                  Existing stock will be adjusted based on your file.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={async () => {
                    try {
                      const { downloadInventoryTemplate } = await import('@/utils/downloadInventoryTemplate');
                      toast.info('Downloading template...');
                      await downloadInventoryTemplate();
                      toast.success('Excel format downloaded');
                    } catch (err) {
                      toast.error('Failed to download template');
                    }
                  }}
                  className="w-full h-14 bg-white border-2 border-slate-100 hover:border-indigo-600 rounded-2xl flex items-center justify-between px-6 transition-all group active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <FileDown size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-700">Download Template</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>

                <label className="block">
                  <span className="sr-only">Choose file</span>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const token = localStorage.getItem('token');
                          if (!token) throw new Error('Token not found');
                          toast.info('Processing cloud update...');
                          const { importInventoryQuantity } = await import('@/graphql/mutation/inventory/importInventoryQuantity');
                          const res = await importInventoryQuantity(token, file);
                          toast.success(`${res.message} ✅`);
                          setSelectedProduct(null);
                          fetchInventory();
                        } catch (err: any) {
                          toast.error('Import failed');
                        }
                      }}
                      className="hidden"
                      id="bulk-upload"
                    />
                    <label 
                      htmlFor="bulk-upload"
                      className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                    >
                      <Upload className="text-slate-300 group-hover:text-indigo-500" size={24} />
                      <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">Click to upload spreadsheet</span>
                    </label>
                  </div>
                </label>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
