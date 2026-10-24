"use client";

import { useEffect, useState } from 'react'
import { getInventoryPooled, InventoryPooledItem } from '@/graphql/query/inventory/getInventoryPooled'
import { myStoresService, MyStore } from '@/graphql/query/myStores'
import { getStockLogs, getVariantStockLogs } from '@/graphql/query/inventory/getLogs'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'
import { StockHistory } from '@/components/catalog/StockHistory'
import { VariantStockManager } from '@/components/catalog/VariantStockManager'
import {
  Package,
  Search,
  Upload,
  History,
  X,
  FileDown,
  ChevronRight,
  Store,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { formatVariantKey } from '@/lib/variants'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<InventoryPooledItem[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [logs, setLogs] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [adjustStoreId, setAdjustStoreId] = useState<number | string | null>(null)

  // === Outlet milik user (utk header kolom per merchant) ===
  const [outlets, setOutlets] = useState<MyStore[]>([])

  useEffect(() => {
    async function loadOutlets() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await myStoresService(token)
        setOutlets(res.myStores || [])
      } catch (e) {
        console.error('Failed to load outlets:', e)
      }
    }
    loadOutlets()
  }, [])

  // Fetch inventory POOLED (per merchant + total)
  const fetchInventory = async (p = page, limit = perPage) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Token not found')
      setLoading(true)
      const res = await getInventoryPooled(token, search, p, limit)
      setInventory(res.data)
      setPagination(res.pagination)
    } catch (err: any) {
      console.error('Failed to load inventory:', err)
      toast.error('Gagal memuat data stok')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Ambil riwayat stok untuk drawer "Stock Audit Trail".
   *
   * Produk ber-varian mencatat perubahannya di product_variant_stock_logs,
   * bukan product_stock_logs — kalau hanya satu tabel yang dibaca, perubahan
   * stok varian (termasuk dari OmBot AI) tidak muncul sama sekali.
   */
  const fetchLogs = async (productId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Token not found')

      const [productLogs, variantLogs] = await Promise.all([
        getStockLogs(token, productId).catch(() => []),
        getVariantStockLogs(token, productId).catch(() => []),
      ])

      const merged = [
        ...productLogs,
        ...variantLogs.map((l: any) => ({ ...l, variant_key: l.variant_stock?.variant_key ?? null })),
      ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setLogs(merged)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat log stok')
    }
  }

  useEffect(() => {
    fetchInventory(page, perPage)

    const handleStoreRefresh = () => {
      setLoading(true)
      fetchInventory(1, perPage)
      setPage(1)
    }

    window.addEventListener('storeRefreshed', handleStoreRefresh)
    return () => window.removeEventListener('storeRefreshed', handleStoreRefresh)
  }, [search, page, perPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="ds-page-head">
          <div>
            <h1 className="ds-display flex items-center gap-2.5">
              <Package className="ds-accent-text" size={28} />
              Inventory &amp; Stock Audit
            </h1>
            <p className="ds-hint">Manage your product stock levels and track adjustments</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Semua outlet (pooled view) */}
            <div
              className="flex items-center gap-2 px-4 h-11 rounded-xl"
              style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', fontSize: 13, fontWeight: 600 }}
            >
              <Store size={15} className="ds-icon-muted" />
              {outlets.length} Outlet
            </div>
            <button
              onClick={() => setSelectedProduct({ mode: 'import' })}
              className="ds-btn"
              data-variant="primary"
            >
              <Upload size={16} />
              Bulk Import
            </button>
          </div>
        </div>

        {/* Search & Stats Card */}
        <div className="ds-card ds-card-pad">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU or Product Name..."
                className="ds-input"
                style={{ paddingLeft: 44, height: 40 }}
              />
            </div>
            <button
              onClick={() => fetchInventory()}
              className="ds-btn shrink-0"
              data-variant="secondary"
              style={{ height: 40, padding: '0 22px' }}
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="ds-card overflow-hidden">
          <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
            <table className="ds-table text-left">
              <thead className="ds-thead">
                <tr>
                  <th className="ds-section-label">Product Information</th>
                  <th className="ds-section-label text-center">SKU Code</th>
                  {outlets.map(o => (
                    <th key={o.id} className="ds-section-label text-center">
                      {o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name}
                    </th>
                  ))}
                  <th className="ds-section-label text-center ds-accent-text">Total</th>
                  <th className="ds-section-label text-right">Riwayat</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3 + outlets.length} className="py-20 text-center">
                      <div className="ds-empty">
                        <Loader2 className="animate-spin ds-accent-text" size={32} />
                        <p className="ds-caption">Fetching inventory data...</p>
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={3 + outlets.length} className="py-20 text-center">
                      <div className="ds-empty">
                        <Package className="ds-icon-muted" size={48} />
                        <p className="ds-body">No inventory data found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    return (
                      <tr key={item.master_product_id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{item.name}</div>
                          <div className="ds-caption" style={{ textTransform: 'lowercase' }}>Item ID: {item.master_product_id}</div>
                          {item.has_variant && (
                            <span className="ds-badge" data-tone="info" style={{ marginTop: 4 }}>
                              Varian
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="ds-mono" style={{ background: 'var(--ds-surface-2)', padding: '4px 9px', borderRadius: 6 }}>
                            {item.sku || 'N/A'}
                          </span>
                        </td>
                        {outlets.map(o => {
                          const cell = item.per_store?.find((p: any) => Number(p.store_id) === Number(o.id))
                          const qty = cell?.qty ?? 0
                          return (
                            <td key={o.id} className="text-center">
                              <button
                                onClick={() => {
                                  setAdjustStoreId(o.id)
                                  setSelectedProduct({ ...item, mode: 'update' })
                                }}
                                className="inline-flex items-center justify-center transition-all"
                                style={{
                                  minWidth: '2.5rem',
                                  padding: '5px 8px',
                                  borderRadius: 8,
                                  fontSize: 13,
                                  fontWeight: 650,
                                  cursor: 'pointer',
                                  border: '1px dashed var(--ds-border-strong)',
                                  background: qty <= 10 && qty > 0 ? '#fef2f2' : 'var(--ds-surface-2)',
                                  color: qty <= 0 ? 'var(--ds-fg-muted)' : qty <= 10 ? 'var(--ds-danger)' : 'var(--ds-fg)',
                                }}
                                title={`Klik angka untuk adjust stok di ${o.name}`}
                              >
                                <span className="underline decoration-dotted underline-offset-2 hover:no-underline">
                                  {qty}
                                </span>
                              </button>
                            </td>
                          )
                        })}
                        <td className="text-center">
                          <span
                            className="ds-num"
                            style={{ fontSize: 15, fontWeight: 650, color: item.total_qty <= 0 ? 'var(--ds-danger)' : 'var(--ds-primary)' }}
                          >
                            {item.total_qty ?? 0}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct({ ...item, mode: 'logs' })
                                fetchLogs(item.master_product_id)
                              }}
                              className="ds-btn"
                              data-variant="ghost"
                              style={{ padding: '0 8px' }}
                              title="Lihat Riwayat Stok"
                            >
                              <History size={18} />
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
          {pagination && (
            <Pagination
              currentPage={page}
              totalPages={pagination.total_pages}
              perPage={perPage}
              totalItems={pagination.total}
              onPageChange={setPage}
              onLimitChange={(limit) => {
                setPerPage(limit);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* 📋 Log Detail Slide-over Drawer */}
      {selectedProduct?.mode === 'logs' && (
        <div className="fixed inset-0 backdrop-blur-sm flex justify-end z-[100] transition-all" style={{ background: 'rgba(24,24,27,0.4)' }}>
          <div
            className="w-full max-w-md h-full flex flex-col"
            style={{ background: 'var(--ds-surface)', boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <div
              className="px-6 py-8 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
            >
              <div>
                <h2 className="ds-h1 flex items-center gap-2">
                  <History className="ds-accent-text" size={24} />
                  Stock Audit Trail
                </h2>
                <p className="ds-section-label mt-1">{selectedProduct.product?.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="ds-btn"
                data-variant="ghost"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {logs.length === 0 ? (
                <div className="ds-empty">
                  <div className="ds-empty-icon">
                    <History size={20} />
                  </div>
                  <p className="ds-caption">No stock adjustments recorded yet.</p>
                </div>
              ) : (
                logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-4 flex items-start gap-4"
                    style={{ background: 'var(--ds-surface-2)', borderRadius: 'var(--ds-radius-sm)', border: '1px solid var(--ds-border)' }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm"
                      style={{
                        fontWeight: 650,
                        background: log.change >= 0 ? '#f0fdf4' : '#fef2f2',
                        color: log.change >= 0 ? '#15803d' : 'var(--ds-danger)',
                        border: `1px solid ${log.change >= 0 ? '#bbf7d0' : '#fecaca'}`,
                      }}
                    >
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="ds-section-label ds-accent-text">{log.source || 'Manual Edit'}</span>
                        <span className="ds-caption">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      {log.variant_key && (
                        <span className="ds-badge" data-tone="info" style={{ marginTop: 4 }}>
                          {formatVariantKey(log.variant_key)}
                        </span>
                      )}
                      <p className="ds-small mt-1 truncate">{log.note || 'No description provided'}</p>
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
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4" style={{ background: 'rgba(24,24,27,0.6)' }}>
          <div
            className="ds-card w-full max-w-lg max-h-[88vh] overflow-y-auto"
            style={{ boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <div
              className="px-8 py-6 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
            >
              <div>
                <h2 className="ds-h1">Stock Correction</h2>
                <p className="ds-section-label ds-accent-text mt-0.5">{selectedProduct.name}</p>
                {adjustStoreId && (
                  <p className="ds-caption mt-1" style={{ color: '#15803d' }}>
                    Outlet: {outlets.find(o => Number(o.id) === Number(adjustStoreId))?.name ?? `#${adjustStoreId}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="ds-btn"
                data-variant="ghost"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {selectedProduct.has_variant ? (
                <>
                  <p className="ds-caption mb-4">
                    Produk ini punya varian — stok dikelola per varian (bukan parent).
                  </p>
                  <VariantStockManager productId={Number(selectedProduct.master_product_id)} attributes={[]} storeId={adjustStoreId ?? undefined} />
                </>
              ) : (
                <StockCard productId={Number(selectedProduct.master_product_id)} onSuccess={fetchInventory} storeId={adjustStoreId ?? undefined} />
              )}
              <StockHistory productId={Number(selectedProduct.master_product_id)} />
            </div>
          </div>
        </div>
      )}

      {/* 📤 Bulk Import Modal */}
      {selectedProduct?.mode === 'import' && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4" style={{ background: 'rgba(24,24,27,0.6)' }}>
          <div
            className="ds-card w-full max-w-md max-h-[88vh] overflow-y-auto"
            style={{ boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <div
              className="px-8 py-6 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
            >
              <h2 className="ds-h1">Bulk Quantity Update</h2>
              <button onClick={() => setSelectedProduct(null)} className="ds-btn" data-variant="ghost" aria-label="Tutup"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div
                className="p-4 flex gap-3"
                style={{ background: 'var(--ds-surface-2)', borderRadius: 'var(--ds-radius-sm)', border: '1px solid var(--ds-border)' }}
              >
                <AlertCircle className="ds-accent-text shrink-0 mt-0.5" size={18} />
                <p className="ds-hint mt-0">
                  Upload an Excel file with columns: <span style={{ fontWeight: 650, color: 'var(--ds-fg)' }}>SKU</span> and <span style={{ fontWeight: 650, color: 'var(--ds-fg)' }}>Quantity</span>. 
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
                  className="ds-btn w-full flex items-center justify-between"
                  data-variant="secondary"
                  style={{ height: 52, padding: '0 20px', justifyContent: 'space-between' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-fg-muted)' }}
                    >
                      <FileDown size={18} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Download Template</span>
                  </div>
                  <ChevronRight size={16} className="ds-icon-muted" />
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
                      className="w-full h-24 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                      style={{ border: '2px dashed var(--ds-border-strong)', borderRadius: 'var(--ds-radius-sm)' }}
                    >
                      <Upload className="ds-icon-muted" size={24} />
                      <span className="ds-caption">Click to upload spreadsheet</span>
                    </label>
                  </div>
                </label>
              </div>
            </div>

            <div
              className="px-8 py-5 flex justify-end"
              style={{ background: 'var(--ds-surface-2)', borderTop: '1px solid var(--ds-border)' }}
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="ds-btn"
                data-variant="secondary"
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
