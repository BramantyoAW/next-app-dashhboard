'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractStoreId } from '@/lib/jwt'
import { graphqlClient } from '@/graphql/graphqlClient'
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from '@/graphql/query/order/getAllOrderByStore'
import UserMenu from '@/components/UserMenu'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return router.push('/login')

        const storeId = extractStoreId(token)
        if (!storeId) return router.push('/login')

        graphqlClient.setHeader('Authorization', `Bearer ${token}`)
        const res = await graphqlClient.request<GetOrdersByStoreResponse>(
          GET_ORDERS_BY_STORE,
          { store_id: storeId, page: 1, limit: 100 }
        )

        setOrders(res.getOrdersByStore.data || [])
        setStoreName(`Store #${UserMenu.storeName}`)
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) return <div className="p-6 text-gray-500">Loading dashboard...</div>

  // === Data preparation ===
  const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0

  // hitung top product
  const productMap: Record<string, number> = {}
  orders.forEach((o) =>
    o.items.forEach((i: any) => {
      productMap[i.product_id] = (productMap[i.product_id] || 0) + i.qty
    })
  )
  const topProductId = Object.keys(productMap).reduce((a, b) =>
    productMap[a] > productMap[b] ? a : b, Object.keys(productMap)[0] || '-'
  )

  // chart: group by month
  const monthlySales: Record<string, number> = {}
  orders.forEach((o) => {
    const date = new Date(o.created_at)
    const month = date.toLocaleString('id-ID', { month: 'short' })
    monthlySales[month] = (monthlySales[month] || 0) + (o.total_amount || 0)
  })

  const chartData = Object.entries(monthlySales).map(([month, value]) => ({
    month,
    sales: value,
  }))

  // pie: distribusi by status
  const statusMap: Record<string, number> = {}
  orders.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1
  })
  const pieData = Object.entries(statusMap).map(([status, value]) => ({
    name: status,
    value,
  }))

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Ringkasan penjualan toko Anda</p>
        </div>
        {storeName && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            {storeName}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
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
          <p className="text-gray-500 text-sm">Top Product ID</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            {topProductId || '-'}
          </h2>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Penjualan per Bulan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
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

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Distribusi Status Order</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
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
            {orders.slice(0, 5).map((o) => (
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
