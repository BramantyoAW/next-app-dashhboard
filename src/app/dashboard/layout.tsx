'use client'

import Link from 'next/link'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getProfile } from '@/graphql/query/getProfile'
import { useRouter } from 'next/navigation'
import UserMenu from '@/components/UserMenu'
import StorePicker from '@/components/StorePicker'
import { myStoresService } from '@/graphql/query/myStores'
import { chooseStoreService } from '@/graphql/mutation/chooseStore'

// 1. Context
const ProfileContext = createContext<any>(null)
export const useProfile = () => useContext(ProfileContext)

// 3. Provider
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    async function fetchProfile() {
      try {
        const res = await getProfile(token as string)
        setProfile(res)
      } catch (err) {
        console.error('Gagal fetch profile:', err)
        router.push('/login')
      }
    }
    fetchProfile()
  }, [router])

  if (!profile) return <div>Loading session...</div>

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
}

// 4. Layout content
function LayoutContent({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const router = useRouter()

  // state untuk ubah toko
  const [storeModal, setStoreModal] = useState(false)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [loadingStore, setLoadingStore] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleOpenChangeStore = async () => {
    const token = localStorage.getItem('token') || ''
    if (!token) return router.push('/login')
    setLoadingStore(true)
    try {
      const res = await myStoresService(token)
      setStores(res.myStores || [])
      setStoreModal(true)
    } catch (e) {
      console.error(e)
      alert('Gagal memuat daftar outlet.')
    } finally {
      setLoadingStore(false)
    }
  }

  const handlePickStore = async (storeId: number) => {
    const token = localStorage.getItem('token') || ''
    if (!token) return
    try {
      const chosen = await chooseStoreService(token, storeId)
      localStorage.setItem('token', chosen.chooseStore.access_token)
      setStoreModal(false)
      // refresh semua data yang terkait token/claim
      router.refresh()
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Gagal memilih outlet.')
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="flex flex-col items-center mb-6">
          <img src="/omBot.png" alt="OmBot Logo" className="w-16 h-16 object-contain mb-2" />
          <span className="text-xs text-gray-500 text-center">Order Management Bot by Bramantyo</span>
        </div>

        <nav className="space-y-2">
          <Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">Dashboard</Link>
          <Link href="/dashboard/order" className="block px-3 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">Orders</Link>
          <details className="mt-4">
            <summary className="text-sm text-gray-500 uppercase tracking-wider cursor-pointer">Catalog</summary>
            <ul className="pl-4 mt-2 space-y-2">
              <li><Link href="/dashboard/catalog/product" className="block px-3 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">Products</Link></li>
              <li><Link href="/dashboard/catalog/attribute" className="block px-3 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium">Attributes</Link></li>
            </ul>
          </details>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <div className="flex items-center space-x-4">
            {/* Dropdown user */}
            <UserMenu
              userName={profile?.me?.user?.full_name ?? 'User'}
              onLogout={handleLogout}
              onChangeStore={handleOpenChangeStore}
            />
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>

      {/* Modal pilih store */}
      {storeModal && (
        <StorePicker
          stores={stores}
          onPick={handlePickStore}
          onCancel={() => setStoreModal(false)}
        />
      )}

      {/* Loading overlay saat fetch daftar store */}
      {loadingStore && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white px-4 py-3 rounded shadow">Memuat outlet…</div>
        </div>
      )}
    </div>
  )
}

// 5. Export layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <LayoutContent>{children}</LayoutContent>
    </ProfileProvider>
  )
}
