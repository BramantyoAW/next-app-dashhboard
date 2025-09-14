'use client';

import React, { useEffect, useState } from 'react';
import { getProfile } from '@/graphql/query/getProfile';
import { getStoreByIdService } from '@/graphql/query/getStoreById';
import { extractStoreId } from '@/lib/jwt';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token') || '';

    if (!token) {
      router.push('/login');
      return;
    }

    const sid = extractStoreId(token);
    setStoreId(sid);

    async function bootstrap() {
      try {
        // 1) profile (opsional, buat cek auth/expiry)
        const data = await getProfile(token) as { data: any } || { data: null };
        setProfile(data);

        // 2) harus punya store_id di token; kalau belum, paksa pilih outlet dulu
        if (!sid) {
          // arahkan ke login/pilih-outlet (tergantung flow kamu)
          router.push('/login');
          return;
        }

        // 3) fetch nama outlet
        const s = await getStoreByIdService(token, sid);
        setStoreName(s.getStoreById?.name ?? `#${sid}`);
      } catch (err) {
        console.error(err);
        router.push('/login');
      }
    }

    bootstrap();
  }, [router]);

  if (!profile) return <div>Loading...</div>;

  const pieData = [
    { name: 'Hari Ini', value: 12 },
    { name: 'Bulan Ini', value: 320 },
    { name: 'Tahun Ini', value: 4820 },
  ];

  const barData = [
    { month: 'Jan', sales: 400 },
    { month: 'Feb', sales: 300 },
    { month: 'Mar', sales: 500 },
    { month: 'Apr', sales: 700 },
    { month: 'Mei', sales: 200 },
    { month: 'Jun', sales: 650 },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B'];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

        {/* Badge outlet aktif */}
        {storeId ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Outlet aktif:</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm font-medium border border-blue-200">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
              {storeName ?? `ID ${storeId}`}
              <span className="text-blue-400">•</span>
              ID {storeId}
            </span>
          </div>
        ) : (
          <span className="text-sm text-red-600">Belum memilih outlet</span>
        )}
      </div>

      <p className="text-gray-600 mb-8">Visualisasi Penjualan (dummy data)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="h-80">
          <h2 className="text-lg font-semibold mb-4">Distribusi Penjualan</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
  );
}
