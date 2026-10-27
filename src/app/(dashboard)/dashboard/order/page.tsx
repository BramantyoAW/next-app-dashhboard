"use client"

import { useEffect, useState } from "react"
import { graphqlClient } from "@/graphql/graphqlClient"
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from "@/graphql/query/order/getAllOrderByStore"
import { useProfile } from "@/app/(dashboard)/dashboard/layout"
import { getActiveStoreId } from '@/lib/jwt'
import { myStoresService, MyStore } from '@/graphql/query/myStores'
import { saveAs } from "file-saver"
import {
  OrderLike,
  orderRows,
  buildCsv,
  saveCsv,
  buildWorkbook,
  saveWorkbook,
  buildPdf,
} from "@/lib/orderExport"
import { resolveImageUrl } from "@/lib/imageUtils"
import { Search, User, Package, Calendar, XCircle, Filter, FileText, Download, Store, ChevronDown } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

/** Ubah snake_case/kebab jadi label yang enak dibaca. */
function labelMeta(key: string) {
  return key.replace(/[_-]/g, ' ')
}

/** Tampilkan nilai skalar; null/undefined/objek kosong jadi "-". */
function MetaScalar({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <>-</>
  }
  if (typeof value === 'boolean') {
    return <>{value ? 'Ya' : 'Tidak'}</>
  }
  return <>{String(value)}</>
}

/**
 * Render metadata bertingkat tanpa pernah mencetak JSON mentah.
 *
 * Data order punya kedalaman variabel (shipping_option.method,
 * shipping_estimate.options[].method), jadi renderer harus rekursif.
 * Sebelumnya hanya 2 level yang ditangani; sisanya jatuh ke
 * JSON.stringify() dan tampil sebagai glondongan JSON di layar.
 */
function MetaValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <>-</>
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="ds-well">
            {item !== null && typeof item === 'object' ? (
              <MetaValue value={item} depth={depth + 1} />
            ) : (
              <span className="ds-body"><MetaScalar value={item} /></span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <>-</>
    return (
      <div className={depth === 0 ? 'space-y-6' : 'space-y-1.5'}>
        {entries.map(([k, v]) => (
          <div
            key={k}
            className={depth === 0 ? 'flex flex-col border-b pb-4' : 'flex ds-body'}
            style={depth === 0 ? { borderColor: 'var(--ds-border)' } : undefined}
          >
            <span className={depth === 0 ? 'ds-section-label mb-1' : 'ds-caption w-32 shrink-0'}>
              {labelMeta(k)}
            </span>
            <div className={depth === 0 ? '' : 'ds-body'} style={{ fontWeight: 600 }}>
              <MetaValue value={v} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <MetaScalar value={value} />
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [inputBy, setInputBy] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const profile = useProfile()

  const [pagination, setPagination] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  // === Pilih Outlet per halaman (dashboard tunggal, order per outlet) ===
  const [outlets, setOutlets] = useState<MyStore[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)

  useEffect(() => {
    async function loadOutlets() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await myStoresService(token)
        setOutlets(res.myStores || [])
        const defaultId = getActiveStoreId(token)
        if (defaultId && res.myStores?.some(s => s.id === defaultId)) {
          setSelectedStoreId(defaultId)
        } else if (res.myStores?.length) {
          setSelectedStoreId(res.myStores[0].id)
        }
      } catch (e) {
        console.error('Failed to load outlets:', e)
      }
    }
    loadOutlets()
  }, [])

  async function fetchOrders(p = page, limit = perPage) {
    try {
      const token = localStorage.getItem('token')
      const storeId = selectedStoreId ?? getActiveStoreId(token)
      if (!token) throw new Error("Token not found")

      graphqlClient.setHeader("Authorization", `Bearer ${token}`)
      const res = await graphqlClient.request<GetOrdersByStoreResponse>(
        GET_ORDERS_BY_STORE,
        { store_id: storeId, page: p, limit: limit }
      )

      setOrders(res.getOrdersByStore.data)
      setFilteredOrders(res.getOrdersByStore.data)
      setPagination(res.getOrdersByStore.pagination)
    } catch (err) {
      console.error("Failed to fetch orders:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(page, perPage)

    const handleStoreRefresh = () => {
      setLoading(true)
      fetchOrders(1, perPage)
      setPage(1)
    }

    window.addEventListener('storeRefreshed', handleStoreRefresh)
    return () => window.removeEventListener('storeRefreshed', handleStoreRefresh)
  }, [page, perPage])

  // Fetch ulang saat ganti outlet
  useEffect(() => {
    if (selectedStoreId) {
      setLoading(true)
      fetchOrders(1, perPage)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId])

  // Filter logic
  useEffect(() => {
    let filtered = [...orders]

    if (search.trim() !== "") {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (inputBy.trim() !== "") {
      filtered = filtered.filter(o =>
        (o.user?.full_name || "").toLowerCase().includes(inputBy.toLowerCase())
      )
    }

    if (itemSearch.trim() !== "") {
      filtered = filtered.filter(o =>
        o.items.some((item: any) => 
          (item.name || "").toLowerCase().includes(itemSearch.toLowerCase())
        )
      )
    }

    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at)
        const from = new Date(dateRange.from)
        const to = new Date(dateRange.to)
        return orderDate >= from && orderDate <= to
      })
    }

    setFilteredOrders(filtered)
  }, [search, inputBy, itemSearch, dateRange, orders])

  const storeName =
    profile?.me?.user?.store_name ||
    orders?.[0]?.store?.name ||
    "Store"

  const safeStoreName = storeName
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
  
  const today = new Date().toISOString().split("T")[0]

  /** Ambil semua order yang cocok filter dari server (bukan 1 halaman). */
  const fetchAllForExport = async (): Promise<OrderLike[]> => {
    const token = localStorage.getItem("token")
    const storeId = selectedStoreId ?? getActiveStoreId(token)
    if (!token) throw new Error("Token not found")

    graphqlClient.setHeader("Authorization", `Bearer ${token}`)

    const all: OrderLike[] = []
    let p = 1
    let totalPages = 1
    do {
      const res = await graphqlClient.request<GetOrdersByStoreResponse>(
        GET_ORDERS_BY_STORE,
        {
          store_id: storeId,
          page: p,
          limit: 100,
          order_number: search.trim() || undefined,
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined,
        }
      )
      const d = res.getOrdersByStore
      all.push(...(d.data as unknown as OrderLike[]))
      totalPages = d.pagination.total_pages
      p += 1
    } while (p <= totalPages && p <= 200)

    // Filter yang hanya ada di sisi klien (petugas & nama produk).
    return all.filter((o) => {
      if (inputBy.trim() && !(o.user?.full_name || "").toLowerCase().includes(inputBy.toLowerCase())) {
        return false
      }
      if (
        itemSearch.trim() &&
        !(o.items || []).some((it) => (it.name || "").toLowerCase().includes(itemSearch.toLowerCase()))
      ) {
        return false
      }
      return true
    })
  }

  const exportData = async (): Promise<OrderLike[] | null> => {
    try {
      const rows = await fetchAllForExport()
      if (!rows.length) alert("Tidak ada data untuk diekspor")
      return rows.length ? rows : null
    } catch (e) {
      console.error("Gagal mengambil seluruh data:", e)
      alert("Gagal mengambil seluruh data. Coba lagi.")
      return null
    }
  }

  /** Ringkasan filter aktif, dicetak di PDF agar laporan bisa dilacak. */
  const filterSummary = (): string[] => {
    const f: string[] = []
    if (search.trim()) f.push(`Order: ${search.trim()}`)
    if (inputBy.trim()) f.push(`Petugas: ${inputBy.trim()}`)
    if (itemSearch.trim()) f.push(`Produk: ${itemSearch.trim()}`)
    if (dateRange.from && dateRange.to) f.push(`Periode: ${dateRange.from} s/d ${dateRange.to}`)
    if (!f.length) f.push("Semua transaksi")
    return f
  }

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const data = await fetch(url)
      const blob = await data.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => resolve(reader.result as string)
      })
    } catch {
      return ""
    }
  }

  const handleExportCsv = async () => {
    const rows = await exportData()
    if (!rows) return
    saveCsv(buildCsv(orderRows(rows) as unknown as Record<string, unknown>[]), `${safeStoreName}_orders_${today}.csv`)
  }

  const handleExportExcel = async () => {
    const rows = await exportData()
    if (!rows) return
    saveWorkbook(buildWorkbook(rows), `${safeStoreName}_orders_${today}.xlsx`)
  }

  const handleExportPDF = async () => {
    const rows = await exportData()
    if (!rows) return

    const [logo, storeLogo] = await Promise.all([
      getBase64FromUrl("/ombotico.png"),
      profile?.me?.user?.store_image
        ? getBase64FromUrl(resolveImageUrl(profile.me.user.store_image))
        : Promise.resolve(""),
    ])

    const doc = buildPdf({
      orders: rows,
      storeName,
      logoBase64: logo,
      storeLogoBase64: storeLogo,
      filterSummary: filterSummary(),
    })
    doc.save(`${safeStoreName}_orders_${today}.pdf`)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current ds-accent-text"></div>
    </div>
  )

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
      {/* Header Section */}
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Order Management</h1>
          <p className="ds-hint">Manage and track all store transactions and exports.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Pilih Outlet */}
          <div className="relative">
            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 ds-icon-muted" size={16} />
            <select
              value={selectedStoreId ?? ''}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="ds-select appearance-none cursor-pointer"
              style={{ paddingLeft: 36, paddingRight: 34 }}
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 ds-icon-muted pointer-events-none" size={15} />
          </div>
          <button
            onClick={handleExportCsv}
            className="ds-btn group"
            data-variant="secondary"
            title="Unduh semua baris hasil filter sebagai CSV"
          >
            <Download size={16} className="text-sky-600 group-hover:scale-110 transition-transform" />
            CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="ds-btn group"
            data-variant="secondary"
            title="Unduh Excel 3 sheet: Orders, Items, Ringkasan"
          >
            <Download size={16} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="ds-btn group"
            data-variant="primary"
            title="Unduh laporan PDF lengkap"
          >
            <FileText size={16} className="group-hover:scale-110 transition-transform" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Advanced Filter Card */}
      <div className="ds-card overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
        >
          <div className="flex items-center gap-2.5 ds-h2">
            <Filter size={18} className="ds-accent-text" />
            <h2 className="ds-h2">Advance Filters</h2>
          </div>
          <button
            onClick={() => {
              setSearch("")
              setInputBy("")
              setItemSearch("")
              setDateRange({ from: "", to: "" })
              setFilteredOrders(orders)
            }}
            className="ds-btn"
            data-variant="ghost"
          >
            <XCircle size={14} className="text-rose-500" />
            <span>Reset Filters</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Filter: Order Number */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <FileText size={13} className="ds-icon-muted" />
                <label className="ds-label mb-0">Order ID</label>
              </div>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. OMBOT-..."
                  className="ds-input"
                  style={{ paddingLeft: 44, paddingRight: 16 }}
                />
              </div>
            </div>

            {/* Filter: Input By */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <User size={13} className="ds-icon-muted" />
                <label className="ds-label mb-0">Input By</label>
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors" size={16} />
                <input
                  type="text"
                  value={inputBy}
                  onChange={(e) => setInputBy(e.target.value)}
                  placeholder="Staff name..."
                  className="ds-input"
                  style={{ paddingLeft: 44, paddingRight: 16 }}
                />
              </div>
            </div>

            {/* Filter: Product Items */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Package size={13} className="ds-icon-muted" />
                <label className="ds-label mb-0">Contains Product</label>
              </div>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors" size={16} />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Product name..."
                  className="ds-input"
                  style={{ paddingLeft: 44, paddingRight: 16 }}
                />
              </div>
            </div>

            {/* Filter: Period Selection (Redesigned) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Calendar size={13} className="ds-icon-muted" />
                <label className="ds-label mb-0">Transactions Period</label>
              </div>
              <div
                className="flex items-center ds-input gap-2 group w-full focus-within:ring-2 focus-within:ring-[var(--ds-ring)]"
                style={{ paddingLeft: 12, paddingRight: 12 }}
              >
                <Calendar size={15} className="ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors shrink-0" />
                <div className="flex items-center flex-1 gap-1">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="bg-transparent border-none p-0 ds-caption ds-num w-full min-w-[90px]"
                  />
                  <span className="ds-icon-muted shrink-0">—</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="bg-transparent border-none p-0 ds-caption ds-num w-full min-w-[90px]"
                  />
                </div>
              </div>
            </div>
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

      {/* Orders Table Container */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th>Order Information</th>
                <th>Assignee</th>
                <th>Transaction Details</th>
                <th>Order Items</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="transition-colors group">
                    <td>
                      <div className="flex flex-col">
                        <span className="ds-h2 ds-num mb-0.5 group-hover:text-[var(--ds-primary)] transition-colors">
                          {order.order_number}
                        </span>
                        <span className="ds-caption">
                          {new Date(order.created_at).toLocaleString('id-ID', { 
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full ds-accent-text flex items-center justify-center ds-caption" style={{ background: 'var(--ds-surface-2)' }}>
                          {(order.user?.full_name || "??")[0].toUpperCase()}
                        </div>
                        <span className="ds-body">
                          {order.user?.full_name || "-"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="ds-caption">Total</span>
                          <span className="ds-body ds-num" style={{ fontWeight: 600 }}>
                            Rp {order.total_amount.toLocaleString()}
                          </span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between items-center text-rose-500">
                            <span className="ds-caption">Discount</span>
                            <span className="ds-caption ds-num">
                              - Rp {order.discount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="ds-chip">
                            {item.name} <span className="ds-accent-text ml-1">x{item.qty}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span className="ds-caption self-center">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="ds-btn-sm"
                        data-tone="neutral"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="ds-empty">
                      <span className="ds-empty-icon text-2xl">📭</span>
                      <h3 className="ds-h2">No orders found</h3>
                      <p className="ds-caption">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(24, 24, 27, 0.6)' }}
        >
          <div className="ds-card w-full max-w-xl max-h-[88vh] overflow-y-auto animate-in fade-in zoom-in duration-200" style={{ boxShadow: 'var(--ds-shadow-lg)' }}>
            <div
              className="p-6 border-b flex justify-between items-center"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <div>
                <h2 className="ds-h1">Order Metadata</h2>
                <p className="ds-section-label mt-2">{selectedOrder.order_number}</p>
              </div>
              <button
                className="h-10 w-10 flex items-center justify-center rounded-full ds-icon-muted transition-colors"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              {selectedOrder.additional_data ? (
                <MetaValue
                  value={
                    typeof selectedOrder.additional_data === 'string'
                      ? (() => {
                          try {
                            return JSON.parse(selectedOrder.additional_data)
                          } catch {
                            return selectedOrder.additional_data
                          }
                        })()
                      : selectedOrder.additional_data
                  }
                />
              ) : (
                <div className="ds-empty">
                  <span className="ds-empty-icon text-2xl">🏜️</span>
                  <p className="ds-caption">No additional data captured for this order.</p>
                </div>
              )}
            </div>
            
            <div
              className="p-6 border-t flex justify-end"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <button
                className="ds-btn"
                data-variant="primary"
                onClick={() => setSelectedOrder(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
