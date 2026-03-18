"use client"

import { useEffect, useState } from "react"
import { graphqlClient } from "@/graphql/graphqlClient"
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from "@/graphql/query/order/getAllOrderByStore"
import { useProfile } from "@/app/dashboard/layout"
import { extractStoreId } from '@/lib/jwt'
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { resolveImageUrl } from "@/lib/imageUtils"
import { Search, User, Package, Calendar, XCircle, Filter, FileText, Download } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

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

  async function fetchOrders(p = page, limit = perPage) {
    try {
      const token = localStorage.getItem('token')
      const storeId = extractStoreId(token)
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

  const handleExportExcel = () => {
    const dataToExport = filteredOrders.length ? filteredOrders : orders
    if (!dataToExport.length) return alert("No data to export")

    const exportData = dataToExport.map((order) => ({
      "Order Number": order.order_number,
      "User": order.user?.full_name || "-",
      // "Discount (Rp)": order.discount,
      "Items": order.items
        .map((item: any) =>
          `Product ${item.name} x${item.qty} = Rp${item.price.toLocaleString()}`
        )
        .join("\n"),
      "Total (Rp)": order.total_amount,
      "Created At": order.created_at,
      // "Additional Data": typeof order.additional_data === "object"
      //   ? JSON.stringify(order.additional_data)
      //   : order.additional_data || "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders")

    const filename = `${safeStoreName}_orders_${today}.xlsx`
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    saveAs(blob, filename)
  }

  // Helper to load image to Base64 for jsPDF
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
      });
    } catch {
      return "";
    }
  };

  const handleExportPDF = async () => {
    const dataToExport = filteredOrders.length ? filteredOrders : orders
    if (!dataToExport.length) return alert("No data to export")

    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // --- 1. Top Header with Logos ---
    // OmBot Logo (Left)
    const omBotLogoBase64 = await getBase64FromUrl("/ombotico.png");
    if (omBotLogoBase64) {
      doc.addImage(omBotLogoBase64, "PNG", 15, 10, 20, 20);
    }

    // Store Logo (Right)
    const storeLogoUrl = profile?.me?.user?.store_image ? resolveImageUrl(profile.me.user.store_image) : undefined;
    if (storeLogoUrl) {
      const storeLogoBase64 = await getBase64FromUrl(storeLogoUrl);
      if (storeLogoBase64) {
        doc.addImage(storeLogoBase64, "JPEG", pageWidth - 35, 10, 20, 20);
      }
    }

    // Content: Store Name & Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text(storeName, pageWidth / 2, 20, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    
    // Format Export Date: 11 Maret 2026
    const exportDateFormatted = new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    doc.text(`Laporan Penjualan OmBot • Per tanggal ${exportDateFormatted}`, pageWidth / 2, 27, { align: "center" })

    // --- 2. Orders Table ---
    const tableData = dataToExport.map((order) => [
      order.order_number,
      order.user?.full_name || "-",
      order.items
        .map(
          (item: any) =>
            `• ${item.name} (x${item.qty}) = Rp ${item.price.toLocaleString()}`
        )
        .join("\n"),
      `Rp ${order.total_amount.toLocaleString()}`,
      new Date(order.created_at).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }),
    ])

    autoTable(doc, {
      startY: 40,
      head: [["Order #", "Petugas", "Item Pesanan", "Total", "Tanggal"]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // blue-600
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        valign: "middle",
      },
      columnStyles: {
        2: { cellWidth: 70 }, // Items
        3: { halign: 'right', fontStyle: 'bold' }, // Total
        4: { halign: 'center' }, // Date
      },
    })

    // --- 3. Summary Footer ---
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const totalSales = dataToExport.reduce((sum, o) => sum + o.total_amount, 0)

    doc.setDrawColor(226, 232, 240) // border slate-200
    doc.line(15, finalY, pageWidth - 15, finalY)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text("Ringkasan Penjualan:", 15, finalY + 10)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Total Pesanan: ${dataToExport.length} Order`, 15, finalY + 17)

    // Highlight Total Terjual
    doc.setFillColor(248, 250, 252) // slate-50
    doc.rect(pageWidth - 85, finalY + 5, 70, 15, 'F')
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Total Terjual:", pageWidth - 80, finalY + 11)
    
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235) // blue-600
    doc.text(`Rp ${totalSales.toLocaleString()}`, pageWidth - 80, finalY + 17)

    doc.save(`${safeStoreName}_orders_${today}.pdf`)
  }


  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-slate-500 mt-1">Manage and track all store transactions and exports.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all gap-2 group active:scale-95 text-xs uppercase tracking-wider"
          >
            <Download size={16} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all gap-2 group active:scale-95 text-xs uppercase tracking-wider"
          >
            <FileText size={16} className="group-hover:scale-110 transition-transform" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Advanced Filter Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold">
            <Filter size={18} className="text-indigo-600" />
            <h2 className="text-base tracking-tight leading-none">Advance Filters</h2>
          </div>
          <button
            onClick={() => {
              setSearch("")
              setInputBy("")
              setItemSearch("")
              setDateRange({ from: "", to: "" })
              setFilteredOrders(orders)
            }}
            className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all active:scale-95 leading-none"
          >
            <XCircle size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Filter: Order Number */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <FileText size={13} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] leading-none">Order ID</label>
              </div>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. OMBOT-..."
                  className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Filter: Input By */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <User size={13} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] leading-none">Input By</label>
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  value={inputBy}
                  onChange={(e) => setInputBy(e.target.value)}
                  placeholder="Staff name..."
                  className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Filter: Product Items */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Package size={13} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] leading-none">Contains Product</label>
              </div>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Product name..."
                  className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Filter: Period Selection (Redesigned) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Calendar size={13} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] leading-none">Transactions Period</label>
              </div>
              <div className="flex items-center bg-slate-50/50 border border-slate-200 rounded-xl h-11 px-3 gap-2 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 focus-within:bg-white transition-all group w-full">
                <Calendar size={15} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors shrink-0" />
                <div className="flex items-center flex-1 gap-1">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 outline-none tabular-nums w-full min-w-[90px]"
                  />
                  <span className="text-slate-300 font-bold shrink-0">—</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 outline-none tabular-nums w-full min-w-[90px]"
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 font-bold text-slate-800">Order Information</th>
                <th className="px-6 py-4 font-bold text-slate-800">Assignee</th>
                <th className="px-6 py-4 font-bold text-slate-800">Transaction Details</th>
                <th className="px-6 py-4 font-bold text-slate-800">Order Items</th>
                <th className="px-6 py-4 font-bold text-slate-800 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 mb-0.5 group-hover:text-indigo-600 transition-colors tabular-nums">
                          {order.order_number}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(order.created_at).toLocaleString('id-ID', { 
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {(order.user?.full_name || "??")[0].toUpperCase()}
                        </div>
                        <span className="text-slate-700 font-medium underline decoration-slate-200 underline-offset-4 decoration-2">
                          {order.user?.full_name || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-xs font-medium uppercase tracking-wider opacity-60">Total</span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            Rp {order.total_amount.toLocaleString()}
                          </span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between items-center text-rose-500">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Discount</span>
                            <span className="text-xs font-semibold tabular-nums">
                              - Rp {order.discount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[300px]">
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200">
                            {item.name} <span className="text-indigo-600 ml-1 font-bold">x{item.qty}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-slate-400 text-[10px] font-bold self-center">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center justify-center px-4 py-1.5 border border-indigo-200 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-4">📭</span>
                      <h3 className="text-slate-800 font-bold mb-1">No orders found</h3>
                      <p className="text-slate-400 text-sm">Try adjusting your filters or search terms.</p>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Order Metadata</h2>
                <p className="text-xs text-slate-400 font-medium uppercase mt-0.5 tracking-widest">{selectedOrder.order_number}</p>
              </div>
              <button
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              {selectedOrder.additional_data ? (
                typeof selectedOrder.additional_data === "object" ? (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(selectedOrder.additional_data).map(([key, value]) => (
                      <div key={key} className="flex flex-col border-b border-slate-50 pb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</span>
                        <span className="text-slate-800 font-semibold">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-indigo-900 rounded-xl p-5 shadow-inner">
                    <pre className="text-indigo-100 text-xs overflow-auto max-h-[400px] leading-relaxed custom-scrollbar font-mono">
                      {JSON.stringify(JSON.parse(selectedOrder.additional_data), null, 4)}
                    </pre>
                  </div>
                )
              ) : (
                <div className="text-center py-10">
                  <span className="text-5xl block mb-4">🏜️</span>
                  <p className="text-slate-400 font-medium">No additional data captured for this order.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
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
