'use client'

import Link from 'next/link'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getProfile } from '@/graphql/query/getProfile'
import { useRouter } from 'next/navigation'

// 1. Buat context
const ProfileContext = createContext<any>(null)

// 2. Hook untuk akses context
export const useProfile = () => useContext(ProfileContext)

// 3. Provider untuk membungkus layout
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    console.log('Token ditemukan:', token)
  
    if (!token) {
      console.log('Token kosong, redirect ke login')
      router.push('/login')
      return
    }
  
    async function fetch() {
      try {
        const res = await getProfile(token as string)
        console.log('Profile berhasil:', res)
        setProfile(res)
      } catch (err) {
        console.error('Gagal fetch profile:', err)
        router.push('/login')
      }
    }
  
    fetch()
  }, [])
  

  if (!profile) return <div>Loading session...</div>

  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  )
}

// 4. Komponen layout utama
function LayoutContent({ children }: { children: React.ReactNode }) {
  const profile = useProfile()

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/omBot.png"
              alt="OmBot Logo"
              className="w-16 h-16 object-contain mb-2"
            />
            <span className="text-xs text-gray-500 text-center">
              Order Management Bot by Bramantyo
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-4">
            <Link href="/dashboard" className="block px-2 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
              Dashboard
            </Link>
            {/* <Link href="/profile" className="block px-2 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
              Profile
            </Link>
            <Link href="/settings" className="block px-2 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
              Settings
            </Link> */}

            <details className="mt-6">
              <summary className="text-sm text-gray-500 uppercase tracking-wider cursor-pointer">
                Catalog
              </summary>
              <ul className="pl-4 space-y-2">
                <li>
                  <Link href="/dashboard/catalog/product" className="block px-2 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
                    Product
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/catalog/attribute" className="block px-2 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">
                    Attribute
                  </Link>
                </li>
              </ul>
            </details>
          </nav>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Halo, {profile?.me?.user?.full_name}</span>
            <Link href="/logout" className="text-red-500 hover:underline">Logout</Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// 5. Export default layout (dibungkus ProfileProvider)
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <LayoutContent>{children}</LayoutContent>
    </ProfileProvider>
  )
}
