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

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const profile = useProfile()

  useEffect(() => {
    async function fetchOrders() {
      try {
        const token = localStorage.getItem('token')
        const storeId = extractStoreId(token)
        if (!token) throw new Error("Token not found")

        graphqlClient.setHeader("Authorization", `Bearer ${token}`)
        const res = await graphqlClient.request<GetOrdersByStoreResponse>(
          GET_ORDERS_BY_STORE,
          { store_id: storeId, page: 1, limit: 50 }
        )

        setOrders(res.getOrdersByStore.data)
        setFilteredOrders(res.getOrdersByStore.data)
      } catch (err) {
        console.error("Failed to fetch orders:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // Filter logic
  useEffect(() => {
    let filtered = [...orders]

    if (search.trim() !== "") {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(search.toLowerCase())
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
  }, [search, dateRange, orders])

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
    const storeLogoUrl = profile?.me?.user?.store_image;
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


  if (loading) return <p className="text-gray-500">Loading orders...</p>

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-sm text-sm"
            >
              📤 Export Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-sm text-sm"
            >
              📄 Export PDF
            </button>
          </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Search Order Number</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ORD-..."
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <button
          onClick={() => {
            setSearch("")
            setDateRange({ from: "", to: "" })
            setFilteredOrders(orders)
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-4 py-2"
        >
          Reset
        </button>
      </div>

      {/* Orders table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Order Number</th>
              <th className="px-6 py-3 border-b">Input by</th>
              <th className="px-6 py-3 border-b">Total</th>
              <th className="px-6 py-3 border-b">Discount</th>
              <th className="px-6 py-3 border-b">Items</th>
              <th className="px-6 py-3 border-b">Created At</th>
              <th className="px-6 py-3 border-b">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 border-b font-medium text-gray-800">
                  {order.order_number}
                </td>
                <td className="px-6 py-4 border-b text-blue-600 font-semibold italic">
                  {order.user?.full_name || "-"}
                </td>
                <td className="px-6 py-4 border-b">
                  Rp {order.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  Rp {order.discount.toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  <ul className="list-disc pl-5 space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        Product {item.name} —{" "}
                        <span className="text-gray-700 font-medium">{item.qty}</span> × Rp{" "}
                        {item.price.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-4 border-b">{order.created_at}</td>
                <td className="px-6 py-4 border-b">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Additional Data */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative animate-fadeIn">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedOrder(null)}
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Additional Data - {selectedOrder.order_number}
            </h2>

            {selectedOrder.additional_data ? (
              typeof selectedOrder.additional_data === "object" ? (
                <ul className="space-y-2">
                  {Object.entries(selectedOrder.additional_data).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium text-gray-800">{key}</span>:{" "}
                      <span className="text-gray-600">{String(value)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="bg-gray-100 rounded p-3 text-sm overflow-auto max-h-80 text-gray-700">
                  {JSON.stringify(JSON.parse(selectedOrder.additional_data), null, 2)}
                </pre>
              )
            ) : (
              <p className="text-gray-500">No additional data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
