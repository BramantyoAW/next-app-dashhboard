'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { graphqlClient } from '@/graphql/graphqlClient'
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from '@/graphql/query/order/getAllOrderByStore'
import { useProfile } from '@/app/(dashboard)/dashboard/layout'
import { useActiveStore } from '@/hooks/useActiveStore'
import OutletSelect from '@/components/ui/OutletSelect'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// Palet selaras token "Lembut Modern" (--ds-primary / --ds-accent).
const C = {
  primary: '#4f46e5',
  accent: '#db2777',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#e11d48',
  slate: '#94a3b8',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Selesai',
  pending: 'Menunggu',
  pending_payment: 'Belum Bayar',
  cancelled: 'Dibatalkan',
  canceled: 'Dibatalkan',
  shipped: 'Dikirim',
}

const STATUS_COLOR: Record<string, string> = {
  completed: C.green,
  pending: C.amber,
  pending_payment: C.rose,
  cancelled: C.slate,
  canceled: C.slate,
  shipped: C.primary,
}

const rp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

/** Sumbu Y ringkas: 1.250.000 → "1,3 jt". */
const compactRp = (n: number) => {
  if (!n) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' M'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' jt'
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb'
  return String(n)
}

export default function DashboardPage() {
  const router = useRouter()
  const profile = useProfile()
  const { stores, activeStoreId, setStore } = useActiveStore()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('1m')

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

        if (!activeStoreId) return

        graphqlClient.setHeader('Authorization', `Bearer ${token}`)
        const dateFrom = getDateFromRange(range)

        const res = await graphqlClient.request<GetOrdersByStoreResponse>(
          GET_ORDERS_BY_STORE,
          {
            store_id: activeStoreId,
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
  }, [router, range, activeStoreId])

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
    if (!Array.isArray(o.items)) return
    o.items.forEach((i: any) => {
      const name = i.name || `Produk #${i.product_id}`
      productSales[name] = (productSales[name] || 0) + (i.qty || 0)
    })
  })

  const topProducts = Object.entries(productSales)
    .map(([name, qty]) => ({ name: name.length > 22 ? name.slice(0, 21) + '…' : name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  const topProductName = topProducts[0]?.name ?? '-'

  /**
   * Tren penjualan per periode. Kunci pakai ISO (YYYY-MM-DD / YYYY-MM) supaya
   * urutannya benar — label "25 Okt" tidak bisa diparse `new Date()` (NaN).
   * Periode kosong tetap diisi 0 agar garis tidak terputus.
   */
  const { series, granularity } = useMemo(() => {
    const daily = ['1w', '2w', '3w', '1m'].includes(range)

    const fmtKey = (d: Date) =>
      daily
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    const agg: Record<string, { sales: number; orders: number }> = {}
    filteredOrders.forEach((o) => {
      const d = new Date(o.created_at)
      if (isNaN(d.getTime())) return
      const k = fmtKey(d)
      if (!agg[k]) agg[k] = { sales: 0, orders: 0 }
      agg[k].sales += o.total_amount || 0
      agg[k].orders += 1
    })

    const keys = Object.keys(agg).sort()
    if (keys.length === 0) return { series: [], granularity: daily ? 'hari' : 'bulan' }

    // Rentang penuh: dari periode paling awal sampai periode terakhir.
    const start = new Date(keys[0] + (daily ? 'T00:00:00' : '-01T00:00:00'))
    const end = new Date(keys[keys.length - 1] + (daily ? 'T00:00:00' : '-01T00:00:00'))

    const rows: { key: string; label: string; sales: number; orders: number }[] = []
    const cursor = new Date(start)
    // ponytail: batas 400 titik cukup untuk 1 tahun harian; naikkan bila perlu.
    for (let i = 0; i < 400 && cursor <= end; i++) {
      const k = fmtKey(cursor)
      rows.push({
        key: k,
        label: daily
          ? cursor.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
          : cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        sales: agg[k]?.sales ?? 0,
        orders: agg[k]?.orders ?? 0,
      })
      if (daily) cursor.setDate(cursor.getDate() + 1)
      else cursor.setMonth(cursor.getMonth() + 1)
    }

    return { series: rows, granularity: daily ? 'hari' : 'bulan' }
  }, [filteredOrders, range])

  const statusData = useMemo(() => {
    const count: Record<string, number> = {}
    filteredOrders.forEach((o) => {
      const s = (o.status || 'lainnya').toLowerCase()
      count[s] = (count[s] || 0) + 1
    })
    return Object.entries(count)
      .map(([status, value]) => ({
        status,
        name: STATUS_LABEL[status] ?? status,
        value,
        color: STATUS_COLOR[status] ?? C.slate,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredOrders])

  const bestDay = series.reduce(
    (best, r) => (r.sales > best.sales ? r : best),
    { label: '-', sales: 0, orders: 0, key: '' }
  )

  // -------------------- Return UI --------------------
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="ds-card ds-card-pad" style={{ height: 88 }}>
          <span className="ds-small">Memuat dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Dashboard</h1>
          <p className="ds-hint">
            {storeName} · {getRangeLabel(range)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="ds-select"
            style={{ width: 160 }}
          >
            <option value="1w">1 Minggu</option>
            <option value="2w">2 Minggu</option>
            <option value="3w">3 Minggu</option>
            <option value="1m">1 Bulan</option>
            <option value="3m">3 Bulan</option>
            <option value="6m">6 Bulan</option>
            <option value="1y">1 Tahun</option>
            <option value="all">Keseluruhan</option>
          </select>

          <OutletSelect stores={stores} value={activeStoreId} onChange={setStore} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total Penjualan', value: rp(totalSales), sub: `Rata-rata ${rp(avgOrderValue)}/pesanan` },
          { label: 'Jumlah Pesanan', value: totalOrders.toLocaleString('id-ID'), sub: `${series.length} periode ${granularity}` },
          { label: 'Rata-rata Pesanan', value: rp(avgOrderValue), sub: 'Nilai transaksi rata-rata' },
          { label: 'Produk Terlaris', value: topProductName, sub: topProducts[0] ? `${topProducts[0].qty} unit terjual` : 'Belum ada penjualan' },
        ].map((k) => (
          <div key={k.label} className="ds-card ds-card-pad">
            <p className="ds-caption">{k.label}</p>
            <h2 className="ds-h1 ds-num mt-1" style={{ fontSize: 22 }}>{k.value}</h2>
            <p className="ds-small mt-1" style={{ color: 'var(--ds-fg-muted)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tren + komposisi status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ds-card ds-card-pad lg:col-span-2">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="ds-h2">Tren Penjualan</h3>
              <p className="ds-caption">Nilai transaksi per {granularity}</p>
            </div>
            {bestDay.sales > 0 && (
              <span className="ds-badge" data-tone="ok">
                Terbaik: {bestDay.label} · {compactRp(bestDay.sales)}
              </span>
            )}
          </div>
          {series.length === 0 ? (
            <div className="ds-empty" style={{ padding: '48px 0' }}>
              <p className="ds-small">Belum ada transaksi pada periode ini.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart data={series} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededf2" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="#71717a" />
                <YAxis tickFormatter={compactRp} tickLine={false} axisLine={false} fontSize={11} stroke="#71717a" width={56} />
                <Tooltip
                  formatter={(v: any) => [rp(Number(v)), 'Penjualan']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #ededf2', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={C.primary}
                  strokeWidth={2.5}
                  fill="url(#salesFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ds-card ds-card-pad">
          <h3 className="ds-h2">Status Pesanan</h3>
          <p className="ds-caption mb-2">Komposisi {totalOrders} pesanan</p>
          {statusData.length === 0 ? (
            <div className="ds-empty" style={{ padding: '48px 0' }}>
              <p className="ds-small">Belum ada pesanan.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusData.map((s) => (
                    <Cell key={s.status} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any, n: any) => [`${v} pesanan`, n]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #ededf2', fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => <span style={{ fontSize: 12, color: '#52525b' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Volume pesanan + produk terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ds-card ds-card-pad">
          <h3 className="ds-h2">Volume Pesanan</h3>
          <p className="ds-caption mb-2">Jumlah pesanan per {granularity}</p>
          {series.length === 0 ? (
            <div className="ds-empty" style={{ padding: '40px 0' }}>
              <p className="ds-small">Belum ada data.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={244}>
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededf2" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="#71717a" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="#71717a" width={36} />
                <Tooltip
                  formatter={(v: any) => [`${v} pesanan`, 'Pesanan']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #ededf2', fontSize: 12 }}
                />
                <Bar dataKey="orders" fill={C.accent} radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ds-card ds-card-pad">
          <h3 className="ds-h2">Produk Terlaris</h3>
          <p className="ds-caption mb-2">5 produk dengan unit terjual terbanyak</p>
          {topProducts.length === 0 ? (
            <div className="ds-empty" style={{ padding: '40px 0' }}>
              <p className="ds-small">Belum ada produk terjual.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={244}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ededf2" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="#71717a" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="#71717a"
                />
                <Tooltip
                  formatter={(v: any) => [`${v} unit`, 'Terjual']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #ededf2', fontSize: 12 }}
                />
                <Bar dataKey="qty" fill={C.green} radius={[0, 6, 6, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="ds-card ds-card-pad">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="ds-h2">Pesanan Terbaru</h3>
            <p className="ds-caption">5 transaksi terakhir pada periode ini</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/order')}
            className="ds-btn"
            data-variant="ghost"
          >
            Lihat Semua →
          </button>
        </div>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead className="ds-thead">
              <tr>
                <th>No. Pesanan</th>
                <th>Status</th>
                <th>Total</th>
                <th>Item</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 5).map((o) => {
                const s = (o.status || '').toLowerCase()
                return (
                  <tr key={o.id}>
                    <td className="font-medium">{o.order_number}</td>
                    <td>
                      <span
                        className="ds-badge"
                        data-tone={s === 'completed' ? 'ok' : s === 'pending_payment' ? 'bad' : 'warn'}
                      >
                        {STATUS_LABEL[s] ?? o.status ?? '-'}
                      </span>
                    </td>
                    <td className="ds-num">{rp(o.total_amount)}</td>
                    <td className="ds-num">{o.items?.length ?? 0}</td>
                    <td className="ds-caption">
                      {new Date(o.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                )
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <p className="ds-small" style={{ padding: '16px 0', color: 'var(--ds-fg-muted)' }}>
                      Belum ada pesanan pada periode ini.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
