'use client'

import Link from 'next/link'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getProfile } from '@/graphql/query/getProfile'
import UserMenu from '@/components/UserMenu'
import StorePicker from '@/components/StorePicker'
import { myStoresService } from '@/graphql/query/myStores'
import { chooseStoreService } from '@/graphql/mutation/chooseStore'
import {
  Home,
  ShoppingCart,
  Package,
  Layers,
  ClipboardList,
  Settings,
} from 'lucide-react'

// ================================
// CONTEXT
// ================================
const ProfileContext = createContext<any>(null)
export const useProfile = () => useContext(ProfileContext)

// ================================
// PROVIDER
// ================================
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  // 👉 Refetch helper
  const refreshProfile = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await getProfile(token)
      setProfile(res)
      window.dispatchEvent(new Event('storeRefreshed'))
    } catch {
      handleForceLogout()
    }
  }

  const handleForceLogout = () => {
    console.warn('Session expired or invalid. Logging out...')
    localStorage.removeItem('token')
    router.replace('/login')
  }

  // 👉 Initial fetch
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    async function fetchProfile() {
      try {
        const res = await getProfile(token)
        setProfile(res)
      } catch (err) {
        console.error('Gagal fetch profile:', err)
        handleForceLogout()
      }
    }

    fetchProfile()
  }, [router])

  // ✅ Check session every 30s
  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('token')
      if (!token) return handleForceLogout()

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const exp = payload.exp ? payload.exp * 1000 : 0
        if (exp && Date.now() > exp) {
          console.log('JWT expired, forcing logout')
          handleForceLogout()
        }
      } catch (err) {
        console.warn('Invalid token structure, forcing logout')
        handleForceLogout()
      }
    }

    const interval = setInterval(checkSession, 30 * 1000) // 🔁 tiap 30 detik
    return () => clearInterval(interval)
  }, [])

  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <img src="/omBot.png" className="w-20 h-20 mb-4 animate-pulse" alt="Loading..." />
        <p className="text-sm">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <ProfileContext.Provider value={{ ...profile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

// ================================
// SIDEBAR LINK COMPONENT
// ================================
function SidebarLink({
  href,
  icon,
  children,
  exact = false,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 ${
        isActive
          ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100'
          : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

// ================================
// MAIN LAYOUT CONTENT
// ================================
function LayoutContent({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const router = useRouter()
  const pathname = usePathname()

  // ============ Store Modal ============
  const [storeModal, setStoreModal] = useState(false)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [loadingStore, setLoadingStore] = useState(false)

  // ============ Actions ============
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

      // ✅ Re-fetch data profile biar langsung update tanpa reload
      await profile.refreshProfile()

    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Gagal memilih outlet.')
    }
  }

  // ============ Dynamic Header Title ============
  function getPageTitle(path: string) {
    if (path.startsWith('/dashboard/catalog/product')) return 'Products'
    if (path.startsWith('/dashboard/catalog/attribute')) return 'Attributes'
    if (path.startsWith('/dashboard/catalog/inventory')) return 'Inventory'
    if (path.startsWith('/dashboard/order')) return 'Orders'
    return 'Dashboard'
  }

  // ================================ RENDER ================================
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/omBot.png"
            alt="OmBot Logo"
            className="w-16 h-16 object-contain mb-2"
          />
          <span className="text-xs text-gray-500 text-center">
            OmBot Application
          </span>
        </div>

        <nav className="space-y-2">
          <SidebarLink href="/dashboard" icon={<Home size={16} />} exact>
            Dashboard
          </SidebarLink>
          <SidebarLink href="/dashboard/order" icon={<ShoppingCart size={16} />}>
            Orders
          </SidebarLink>

          <p className="mt-6 mb-1 text-xs text-gray-400 uppercase font-semibold tracking-wider">
            Catalog
          </p>

          <SidebarLink href="/dashboard/catalog/product" icon={<Package size={16} />}>
            Products
          </SidebarLink>
          <SidebarLink href="/dashboard/catalog/attribute" icon={<Layers size={16} />}>
            Attributes
          </SidebarLink>
          <SidebarLink href="/dashboard/catalog/inventory" icon={<ClipboardList size={16} />}>
            Inventory
          </SidebarLink>
          <p className="mt-6 mb-1 text-xs text-gray-400 uppercase font-semibold tracking-wider">
            Settings
          </p>
          <SidebarLink href="/dashboard/settings/configuration" icon={<Settings size={16} />}>
            Configuration
          </SidebarLink>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow">
          <h2 className="text-xl font-semibold">{getPageTitle(pathname)}</h2>
          <div className="flex items-center space-x-4">
            <UserMenu
              userName={profile?.me?.user?.full_name ?? 'User'}
              storeName={profile?.me?.user?.store_name ?? 'Belum pilih toko'}
              onLogout={handleLogout}
              onChangeStore={handleOpenChangeStore}
            />
          </div>
        </header>

        <main className="p-6 flex-1">{children}</main>
        {/* Footer */}
        <footer className="mt-auto bg-gray-50 text-center py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            © 2025 <span className="font-semibold text-gray-700">OmBot</span> by <span className="font-medium text-blue-600">Bramantyo</span>.
            <br className="hidden sm:block" />
            <span className="italic text-gray-600">Untuk UMKM, Untuk Indonesia 🇮🇩</span>
            </p>
          </footer>
      </div>

      {/* Modal pilih store */}
      {storeModal && (
        <StorePicker
          stores={stores}
          onPick={handlePickStore}
          onCancel={() => setStoreModal(false)}
        />
      )}

      {/* Loading overlay */}
      {loadingStore && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white px-4 py-3 rounded shadow">Memuat outlet…</div>
        </div>
      )}
    </div>
  )
}

// ================================
// EXPORT LAYOUT
// ================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <LayoutContent>{children}</LayoutContent>
    </ProfileProvider>
  )
}
