'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { extractStoreId } from '@/lib/jwt'
import { graphqlClient } from '@/graphql/graphqlClient'
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from '@/graphql/query/order/getAllOrderByStore'
import { useProfile } from '@/app/dashboard/layout'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const profile = useProfile()

  // ✅ Semua hooks selalu dipanggil di urutan tetap
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('all')

  const storeName = profile?.me?.user?.store_name ?? 'Belum pilih toko'

  // -------------------- Helper functions --------------------
  const getDateFromRange = (range: string) => {
    const now = new Date()
    const date = new Date()
    switch (range) {
      case '1w': date.setDate(now.getDate() - 7); break
      case '2w': date.setDate(now.getDate() - 14); break
      case '3w': date.setDate(now.getDate() - 21); break
      case '1m': date.setMonth(now.getMonth() - 1); break
      case '3m': date.setMonth(now.getMonth() - 3); break
      case '6m': date.setMonth(now.getMonth() - 6); break
      case '1y': date.setFullYear(now.getFullYear() - 1); break
      default: return null
    }
    return date
  }

  const getRangeLabel = (range: string) => {
    switch (range) {
      case '1w': return '1 Minggu Terakhir'
      case '2w': return '2 Minggu Terakhir'
      case '3w': return '3 Minggu Terakhir'
      case '1m': return '1 Bulan Terakhir'
      case '3m': return '3 Bulan Terakhir'
      case '6m': return '6 Bulan Terakhir'
      case '1y': return '1 Tahun Terakhir'
      default: return 'Keseluruhan Waktu'
    }
  }

  // -------------------- Fetch Orders --------------------
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const storeId = extractStoreId(token)
        if (!storeId) {
          router.push('/login')
          return
        }

        graphqlClient.setHeader('Authorization', `Bearer ${token}`)
        const dateFrom = getDateFromRange(range)

        const res = await graphqlClient.request<GetOrdersByStoreResponse>(
          GET_ORDERS_BY_STORE,
          {
            store_id: storeId,
            page: 1,
            limit: 100,
            ...(dateFrom ? { date_from: dateFrom.toISOString().split('T')[0] } : {}),
          }
        )

        setOrders(res.getOrdersByStore.data || [])
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const handleRefresh = () => fetchData()
    window.addEventListener('storeRefreshed', handleRefresh)
    return () => window.removeEventListener('storeRefreshed', handleRefresh)
  }, [router, range])

  // -------------------- Derived Data --------------------
  const filteredOrders = useMemo(() => {
    if (range === 'all') return orders
    const dateFrom = getDateFromRange(range)
    if (!dateFrom) return orders
    return orders.filter((o) => new Date(o.created_at) >= dateFrom)
  }, [orders, range])

  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const totalOrders = filteredOrders.length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0

  const productSales: Record<string, number> = {}
  filteredOrders.forEach((o) => {
    if (!o.items || !Array.isArray(o.items)) return
    o.items.forEach((i: any) => {
      const name = i.name || i.product?.name || `Product #${i.product_id}`
      productSales[name] = (productSales[name] || 0) + (i.qty || 0)
    })
  })

  const productNames = Object.keys(productSales)
  const topProductName =
    productNames.length > 0
      ? productNames.reduce((a, b) => (productSales[a] > productSales[b] ? a : b))
      : '-'

  const chartMap: Record<string, number> = {}

  filteredOrders.forEach((o) => {
    const date = new Date(o.created_at)
    let key: string

    // range adaptif
    if (['1w', '2w', '3w'].includes(range)) {
      // tampil per tanggal
      key = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    } else {
      // tampil per bulan
      key = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
    }

    chartMap[key] = (chartMap[key] || 0) + (o.total_amount || 0)
  })

  const chartData = Object.entries(chartMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([label, sales]) => ({ label, sales }))
  const statusMap: Record<string, number> = {}
  filteredOrders.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1
  })
  const pieData = Object.entries(statusMap).map(([status, value]) => ({ name: status, value }))
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  // -------------------- Return UI --------------------
  if (loading) {
    // ✅ di bawah semua hooks
    return <div className="p-6 text-gray-500">Loading dashboard...</div>
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">{getRangeLabel(range)}</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Keseluruhan</option>
            <option value="1w">1 Minggu</option>
            <option value="2w">2 Minggu</option>
            <option value="3w">3 Minggu</option>
            <option value="1m">1 Bulan</option>
            <option value="3m">3 Bulan</option>
            <option value="6m">6 Bulan</option>
            <option value="1y">1 Tahun</option>
          </select>

          {storeName && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
              {storeName}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-gray-500 text-sm">Total Sales</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            Rp {totalSales.toLocaleString('id-ID')}
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-gray-500 text-sm">Total Orders</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{totalOrders}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-gray-500 text-sm">Avg. Order Value</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            Rp {avgOrderValue.toLocaleString('id-ID')}
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-gray-500 text-sm">Top Product</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{topProductName}</h2>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Line */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {getRangeLabel(range)} — Menampilkan {chartData.length} periode
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Distribusi Status Order</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
          <button
            onClick={() => router.push('/dashboard/order')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Order #</th>
              <th className="text-left px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Items</th>
              <th className="text-left px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.slice(0, 5).map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{o.order_number}</td>
                <td className="px-4 py-2">Rp {o.total_amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-2">{o.items.length}</td>
                <td className="px-4 py-2 text-gray-500">{o.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
