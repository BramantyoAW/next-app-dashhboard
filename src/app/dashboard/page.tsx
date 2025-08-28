'use client'

import React, { useEffect, useState } from 'react'
import { getProfile } from '@/graphql/query/getProfile'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token') || ''

    if (!token) {
      router.push('/login');
      return
    }

    async function fetchProfile() {
      try {
        const data = await getProfile(token) as { data: any } || { data: null };
        setProfile(data)
      } catch (err) {
        router.push('/login')
        console.error(err)
      }
    }

    fetchProfile()
  }, [])

  if (!profile) {
    return <div>Loading...</div>
  }

const pieData = [
    { name: "Hari Ini", value: 12 },
    { name: "Bulan Ini", value: 320 },
    { name: "Tahun Ini", value: 4820 },
  ]

  const barData = [
    { month: "Jan", sales: 400 },
    { month: "Feb", sales: 300 },
    { month: "Mar", sales: 500 },
    { month: "Apr", sales: 700 },
    { month: "Mei", sales: 200 },
    { month: "Jun", sales: 650 },
  ]

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B"]
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard</h1>
      <p className="text-gray-600 mb-8">Visualisasi Penjualan (dummy data)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="h-80">
          <h2 className="text-lg font-semibold mb-4">Distribusi Penjualan</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="h-80">
          <h2 className="text-lg font-semibold mb-4">Penjualan per Bulan</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
