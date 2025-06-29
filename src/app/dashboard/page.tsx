'use client'

import React, { useEffect, useState } from 'react'
import { getProfile } from '@/graphql/query/getProfile'
import { useRouter } from 'next/navigation'

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

  // return (
  //   <div className="min-h-screen bg-gray-100 p-8">
  //     <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6">
  //       <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
  //       <p className="text-gray-700">
  //         Selamat datang, {profile.me.user.full_name}! 🎉
  //       </p>

  //       <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
  //         <div className="bg-blue-50 p-4 rounded-xl shadow">
  //           <h2 className="text-lg font-semibold">Statistik 1</h2>
  //           <p className="text-sm text-gray-600">Data statistik singkat</p>
  //         </div>
  //         <div className="bg-green-50 p-4 rounded-xl shadow">
  //           <h2 className="text-lg font-semibold">Statistik 2</h2>
  //           <p className="text-sm text-gray-600">Informasi penting lainnya</p>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // )
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-700">Ini isi dashboard kamu 🎉</p>
    </div>
  )
}
