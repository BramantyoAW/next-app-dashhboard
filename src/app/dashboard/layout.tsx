'use client'

import Link from 'next/link'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getProfile } from '@/graphql/query/getProfile'
import UserMenu from '@/components/UserMenu'
import StorePicker from '@/components/StorePicker'
import { myStoresService } from '@/graphql/query/myStores'
import { chooseStoreService } from '@/graphql/mutation/chooseStore'
import { resolveImageUrl } from '@/lib/imageUtils'
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
  Coins,
  Store,
  MessagesSquare,
  Zap
} from 'lucide-react'

const ProfileContext = createContext<any>(null)
export const useProfile = () => useContext(ProfileContext)

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

        // Redirect staff users to chat gateway
        const { extractStoreRole, extractStoreId } = await import('@/lib/jwt');
        const jwtStoreRole = extractStoreRole(token);
        const jwtStoreId = extractStoreId(token);
        
        const profileRole = res?.me?.user?.store_role;
        const profileId = res?.me?.user?.store_id;
        
        const role = jwtStoreRole || profileRole;
        const sid = jwtStoreId || profileId;

        if (role === 'staff' && sid && window.location.pathname.startsWith('/dashboard')) {
          router.replace(`/chat/${sid}`);
        }
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
        <img src="/ombotico.png" className="w-16 h-16 md:w-20 md:h-20 mb-4 animate-pulse" alt="Loading..." />
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
      className={`flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-gradient-brand text-white shadow-md font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
        {icon}
      </span>
      <span className="text-sm">{children}</span>
    </Link>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const router = useRouter()
  const pathname = usePathname()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [storeModal, setStoreModal] = useState(false)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [loadingStore, setLoadingStore] = useState(false)

  const isStaff = profile?.me?.user?.store_role === 'staff';

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
    if (path.startsWith('/dashboard/settings/gateway')) return 'Gateway'
    if (path.startsWith('/dashboard/settings/store')) return 'Store Profile'
    if (path.startsWith('/dashboard/settings/configuration')) return 'Configuration'
    if (path.startsWith('/dashboard/settings')) return 'Settings'
    if (path.startsWith('/conversations')) return 'Conversations'
    if (path.startsWith('/chat')) return profile?.me?.user?.store_name ?? 'Chat'
    return 'Dashboard Overview'
  }

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* Sidebar Overlay */}
      {!isStaff && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isStaff && (
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 md:w-72 bg-white border-r border-slate-200 p-4 md:p-6 flex flex-col
        transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none
        lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <Link href="/dashboard" className="flex flex-col items-center gap-3 group w-full pt-2">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl blur opacity-15 group-hover:opacity-30 transition-opacity"></div>
              <img
                src="/ombotico.png"
                alt="OmBot"
                className="relative w-16 md:w-24 h-16 md:h-24 object-contain transition-all duration-500 group-hover:scale-105 drop-shadow-xl"
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-2xl md:text-3xl tracking-tighter text-slate-900 leading-none">omBot</span>
              <span className="text-[9px] md:text-[10px] text-blue-600 uppercase tracking-widest font-bold mt-1.5 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50">Order Management Bot</span>
            </div>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar no-scrollbar pb-4">
          <SidebarLink href="/dashboard" icon={<Home size={18} />} exact onClick={() => setIsSidebarOpen(false)}>
            Overview
          </SidebarLink>
          <SidebarLink href="/dashboard/order" icon={<ShoppingCart size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Orders
          </SidebarLink>
          <SidebarLink href="/dashboard/points" icon={<Coins size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Credits & Points
          </SidebarLink>

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catalog</span>
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

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User & Store</span>
          </div>
          <SidebarLink href="/dashboard/user" icon={<Users size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Users
          </SidebarLink>
          <SidebarLink href="/dashboard/user/message" icon={<MessageCircle size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Messages
          </SidebarLink>

          <SidebarLink href="/conversations" icon={<MessagesSquare size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Conversations
          </SidebarLink>

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settings</span>
          </div>
          <SidebarLink href="/dashboard/settings/store" icon={<Store size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Store Profile
          </SidebarLink>
          <SidebarLink href="/dashboard/settings/gateway" icon={<Zap size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Gateway
          </SidebarLink>
          <SidebarLink href="/dashboard/settings/configuration" icon={<Settings size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Configuration
          </SidebarLink>
        </nav>

        {/* User Profile Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {profile?.me?.user?.full_name?.[0] ?? 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-800 truncate">{profile?.me?.user?.full_name}</span>
              <span className="text-[11px] text-slate-500 truncate">{profile?.me?.user?.store_name}</span>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4">
            {!isStaff && (
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} className="text-slate-700" />
            </button>
            )}
            <h2 className="text-base md:text-lg font-bold tracking-tight text-slate-800">{getPageTitle(pathname)}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Budget Pill */}
            {!isStaff && (
            <Link
              href="/dashboard/points"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 hover:bg-amber-100 transition-all shadow-sm group flex-shrink-0"
            >
              <Coins size={15} className="text-amber-500" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-bold uppercase tracking-tight opacity-60">Budget</span>
                <span className="text-sm font-black tracking-tight">{profile?.me?.user?.store_points?.toLocaleString() ?? 0}</span>
              </div>
            </Link>
            )}

            <UserMenu
              userName={profile?.me?.user?.full_name ?? 'User'}
              storeName={profile?.me?.user?.store_name ?? 'Belum pilih toko'}
              storeImage={profile?.me?.user?.store_image ? resolveImageUrl(profile.me.user.store_image) : undefined}
              isStaff={isStaff}
              onLogout={handleLogout}
              onChangeStore={handleOpenChangeStore}
            />
          </div>
        </header>

        {/* Content Area */}
        <main className={`flex-1 overflow-y-auto relative ${pathname.startsWith('/chat') ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
          <div className={`${pathname.startsWith('/chat') ? 'w-full' : 'max-w-7xl mx-auto'} h-full`}>
            {children}
          </div>
        </main>

        {/* Footer */}
        {!pathname.startsWith('/chat') && (
        <footer className="py-4 md:py-6 px-6 md:px-8 bg-white border-t border-slate-100 text-center lg:text-left">
          <div className="flex flex-col md:flex-row md:justify-between items-center gap-2 md:gap-4">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} <span className="font-bold text-slate-600">OmBot</span>. Built with care for Indonesia.
            </p>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">
              <span>Efficiency</span>
              <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
              <span>Reliability</span>
              <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
              <span>Growth</span>
            </div>
          </div>
        </footer>
        )}
      </div>

      {/* Store Picker Modal */}
      {storeModal && (
        <StorePicker
          stores={stores}
          onPick={handlePickStore}
          onCancel={() => setStoreModal(false)}
        />
      )}

      {/* Loading Overlay */}
      {loadingStore && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-700">Changing your store...</span>
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