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
  Users,
  MessageCircle,
  Menu,
  X,
  Coins
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
    localStorage.removeItem('token')
    router.replace('/login')
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    async function fetchProfile() {
      try {
        const res = await getProfile(token!);
        setProfile(res);
      } catch (err) {
        handleForceLogout()
      }
    }

    fetchProfile()
  }, [router])

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('token')
      if (!token) return handleForceLogout()

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const exp = payload.exp ? payload.exp * 1000 : 0
        if (exp && Date.now() > exp) handleForceLogout()
      } catch (err) {
        handleForceLogout()
      }
    }

    const interval = setInterval(checkSession, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-muted-foreground">
        <img src="/omBot.png" className="w-20 h-20 mb-4 animate-pulse" alt="Loading..." />
        <p className="text-sm font-medium">Loading your dashboard...</p>
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
  onClick,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  exact?: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group hover-scale ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="text-sm">{children}</span>
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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
      await profile.refreshProfile()
    } catch (e: any) {
      console.error(e)
    }
  }

  function getPageTitle(path: string) {
    if (path.startsWith('/dashboard/catalog/product')) return 'Products'
    if (path.startsWith('/dashboard/catalog/attribute')) return 'Attributes'
    if (path.startsWith('/dashboard/catalog/inventory')) return 'Inventory'
    if (path.startsWith('/dashboard/order')) return 'Orders'
    if (path.startsWith('/dashboard/user/message')) return 'User Messages'
    if (path.startsWith('/dashboard/user')) return 'Users'
    if (path.startsWith('/dashboard/settings')) return 'Settings'
    return 'Dashboard Overview'
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border p-6 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-10">
          <Link href="/dashboard" className="flex items-center gap-3">
            {profile?.me?.user?.store_image && (
              <div className="p-1 bg-white rounded-xl shadow-sm border border-border">
                <img src={profile.me.user.store_image} alt="Store Logo" className="w-10 h-10 object-cover rounded-lg" />
              </div>
            )}
            <div className="p-2 bg-primary/10 rounded-xl">
              <img src="/omBot.png" alt="OmBot" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight line-clamp-1">{profile?.me?.user?.store_name || 'OmBot'}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Dashboard</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 hover:bg-secondary rounded-lg" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
          <SidebarLink href="/dashboard" icon={<Home size={18} />} exact onClick={() => setIsSidebarOpen(false)}>
            Overview
          </SidebarLink>
          <SidebarLink href="/dashboard/order" icon={<ShoppingCart size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Orders
          </SidebarLink>
          <SidebarLink href="/dashboard/points" icon={<Coins size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Credits & Points
          </SidebarLink>

          <div className="pt-6 pb-2 px-4">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Catalog</span>
          </div>
          <SidebarLink href="/dashboard/catalog/product" icon={<Package size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Products
          </SidebarLink>
          <SidebarLink href="/dashboard/catalog/attribute" icon={<Layers size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Attributes
          </SidebarLink>
          <SidebarLink href="/dashboard/catalog/inventory" icon={<ClipboardList size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Inventory
          </SidebarLink>

          <div className="pt-6 pb-2 px-4">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">User & Store</span>
          </div>
          <SidebarLink href="/dashboard/user" icon={<Users size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Users
          </SidebarLink>
          <SidebarLink href="/dashboard/user/message" icon={<MessageCircle size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Messages
          </SidebarLink>

          <div className="pt-6 pb-2 px-4">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Settings</span>
          </div>
          <SidebarLink href="/dashboard/settings/configuration" icon={<Settings size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Configuration
          </SidebarLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="p-4 bg-secondary/50 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile?.me?.user?.full_name?.[0] ?? 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">{profile?.me?.user?.full_name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{profile?.me?.user?.store_name}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 py-4 glass border-b border-border">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 hover:bg-secondary rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{getPageTitle(pathname)}</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <Link 
              href="/dashboard/points"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 hover:bg-amber-100 transition-all shadow-sm group"
            >
              <Coins size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">Budget</span>
                <span className="text-sm font-black tracking-tight">{profile?.me?.user?.store_points?.toLocaleString() ?? 0}</span>
              </div>
            </Link>

            <UserMenu
              userName={profile?.me?.user?.full_name ?? 'User'}
              storeName={profile?.me?.user?.store_name ?? 'Belum pilih toko'}
              onLogout={handleLogout}
              onChangeStore={handleOpenChangeStore}
            />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-in relative">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 bg-card border-t border-border text-center lg:text-left flex flex-col lg:flex-row lg:justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2025 <span className="font-bold text-foreground">OmBot</span>. Built with ❤️ for Indonesia.
          </p>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
             <span>Efficiency</span>
             <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
             <span>Reliability</span>
             <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
             <span>Growth</span>
          </div>
        </footer>
      </div>

      {/* Modals & Overlays */}
      {storeModal && (
        <StorePicker
          stores={stores}
          onPick={handlePickStore}
          onCancel={() => setStoreModal(false)}
        />
      )}

      {loadingStore && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Changing your store...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <LayoutContent>{children}</LayoutContent>
    </ProfileProvider>
  )
}
