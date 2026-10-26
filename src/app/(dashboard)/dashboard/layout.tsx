'use client'

import Link from 'next/link'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getProfile } from '@/graphql/query/getProfile'
import UserMenu from '@/components/UserMenu'
import OmBotAiAssistance from '@/components/ai-ops/OmBotAiAssistance'
import { openAiPanel } from '@/lib/aiPanelBus'
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
  Sparkles,
  Store,
  Zap,
  Globe,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen
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
  const isActive = exact
    ? pathname === href
    : pathname === href || (pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive ? 'true' : undefined}
      // data-title dipakai tooltip CSS saat sidebar dilipat jadi rail ikon.
      data-title={typeof children === 'string' ? children : undefined}
      className="sidebar-link relative"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 11px',
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
        background: isActive ? 'var(--ds-surface-2)' : 'transparent',
        color: isActive ? 'var(--ds-fg)' : 'var(--ds-fg-muted)',
        transition: 'background-color .12s ease, color .12s ease',
      }}
    >
      <span
        style={{ flex: 'none', display: 'inline-flex', color: isActive ? 'var(--ds-primary)' : 'inherit' }}
      >
        {icon}
      </span>
      <span className="sidebar-label" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </Link>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const router = useRouter()
  const pathname = usePathname()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Desktop: lipat sidebar jadi rail ikon. Drawer mobile pakai isSidebarOpen.
  const [collapsed, setCollapsed] = useState(false)
  // Saldo AI Point ditampilkan real time: panel OmBot AI mengirim nilai terbaru
  // lewat event `aiPointsChanged` setiap kali poin terpotong, sehingga angka di
  // header ikut turun tanpa perlu refresh halaman.
  const [aiPoints, setAiPoints] = useState(0)

  const isStaff = profile?.me?.user?.store_role === 'staff';

  // Sumber awal: profil dari server.
  useEffect(() => {
    const dariProfil = profile?.me?.user?.user_ai_points
    if (typeof dariProfil === 'number') setAiPoints(dariProfil)
  }, [profile?.me?.user?.user_ai_points])

  // Pembaruan real time dari panel AI / halaman points.
  useEffect(() => {
    const onAiPoints = (e: Event) => {
      const detail = (e as CustomEvent<{ aiPoints?: number }>).detail
      if (typeof detail?.aiPoints === 'number') setAiPoints(detail.aiPoints)
    }
    window.addEventListener('aiPointsChanged', onAiPoints)
    return () => window.removeEventListener('aiPointsChanged', onAiPoints)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  function getPageTitle(path: string) {
    if (path.startsWith('/dashboard/merchant')) return 'Merchant'
    if (path.startsWith('/dashboard/catalog/product')) return 'Products'
    if (path.startsWith('/dashboard/catalog/inventory')) return 'Inventory'
    if (path.startsWith('/dashboard/order')) return 'Orders'
    if (path.startsWith('/dashboard/user/message')) return 'User Messages'
    if (path.startsWith('/dashboard/user')) return 'Users'
    if (path.startsWith('/dashboard/settings/gateway')) return 'Gateway'
    if (path.startsWith('/dashboard/settings/payment')) return 'Payment Settings'
    if (path.startsWith('/dashboard/settings/store')) return 'Store Profile'
    if (path.startsWith('/dashboard/settings/configuration')) return 'Configuration'
    if (path.startsWith('/dashboard/settings')) return 'Settings'
    if (path.startsWith('/chat')) return profile?.me?.user?.store_name ?? 'Chat'
    return 'Dashboard Overview'
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--ds-bg)' }}>

      {/* Sidebar Overlay */}
      {!isStaff && isSidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          style={{ background: 'rgba(24,24,27,.32)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isStaff && (
      <aside className={`
        ds-sidebar
        fixed inset-y-0 left-0 z-50 w-64 md:w-72 flex flex-col p-4 md:p-6
        transition-transform duration-300 ease-in-out lg:shadow-none
        lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      data-collapsed={collapsed ? 'true' : 'false'}
      style={{
        background: 'var(--ds-surface)',
        borderRight: '1px solid var(--ds-border)',
        boxShadow: 'var(--ds-shadow-lg)',
      }}>
        {/* Logo */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <Link href="/dashboard" className="sidebar-brand flex flex-col items-center gap-3 group w-full pt-2">
            <img
              src="/ombotico.png"
              alt="OmBot"
              className="sidebar-logo w-16 md:w-24 h-16 md:h-24 object-contain"
            />
            <div className="sidebar-brand-text flex flex-col items-center">
              <span
                className="text-2xl md:text-3xl leading-none"
                style={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ds-fg)' }}
              >
                omBot
              </span>
              <span
                className="mt-1.5 rounded-full px-2.5 py-0.5 text-[9px] md:text-[10px] uppercase"
                style={{
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--ds-primary)',
                  background: 'var(--ds-surface-2)',
                  border: '1px solid var(--ds-border)',
                }}
              >
                Order Management Bot
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} style={{ color: 'var(--ds-fg-muted)' }} />
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

          <div className="sidebar-group pt-5 pb-1.5 px-3">
            <span className="ds-section-label">Catalog</span>
          </div>
          <SidebarLink href="/dashboard/catalog/product" icon={<Package size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Products
          </SidebarLink>
          <SidebarLink href="/dashboard/catalog/inventory" icon={<ClipboardList size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Inventory
          </SidebarLink>

          <div className="sidebar-group pt-5 pb-1.5 px-3">
            <span className="ds-section-label">Web Store</span>
          </div>
          <SidebarLink href="/owner/web-store" icon={<Globe size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Web Store Setup
          </SidebarLink>
          <SidebarLink href="/owner/web-store/products" icon={<Package size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Master Products
          </SidebarLink>

          <div className="sidebar-group pt-5 pb-1.5 px-3">
            <span className="ds-section-label">User &amp; Store</span>
          </div>
          <SidebarLink href="/dashboard/merchant" icon={<Store size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Merchant
          </SidebarLink>
          <SidebarLink href="/dashboard/user" icon={<Users size={18} />} exact onClick={() => setIsSidebarOpen(false)}>
            Users
          </SidebarLink>
          <SidebarLink href="/dashboard/user/message" icon={<MessageCircle size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Messages
          </SidebarLink>

          <div className="sidebar-group pt-5 pb-1.5 px-3">
            <span className="ds-section-label">Settings</span>
          </div>
          <SidebarLink href="/dashboard/settings/store" icon={<Store size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Store Profile
          </SidebarLink>
          <SidebarLink href="/dashboard/settings/gateway" icon={<Zap size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Gateway
          </SidebarLink>
          <SidebarLink href="/dashboard/settings/payment" icon={<CreditCard size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Payment
          </SidebarLink>
          <SidebarLink href="/dashboard/settings/configuration" icon={<Settings size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Configuration
          </SidebarLink>
        </nav>

        {/* User Profile Footer */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ds-border)' }}>
          <div
            className="sidebar-profile p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)', fontWeight: 600 }}
            >
              {profile?.me?.user?.full_name?.[0] ?? 'U'}
            </div>
            <div className="sidebar-profile-text flex flex-col min-w-0 flex-1">
              <span className="text-sm truncate" style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{profile?.me?.user?.full_name}</span>
              <span className="text-[11px] truncate" style={{ color: 'var(--ds-fg-muted)' }}>{profile?.me?.user?.store_name}</span>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 backdrop-blur-md"
          style={{
            background: 'var(--ds-surface)',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <div className="flex items-center gap-3 md:gap-4">
            {!isStaff && (
            <button
              className="lg:hidden p-2 rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} style={{ color: 'var(--ds-fg)' }} />
            </button>
            )}
            {!isStaff && (
            <button
              className="hidden lg:flex p-2 rounded-xl transition-colors"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Tampilkan menu samping' : 'Sembunyikan menu samping'}
              title={collapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
              style={{ color: 'var(--ds-fg-muted)' }}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            )}
            <h2 className="text-base md:text-lg" style={{ fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ds-fg)' }}>{getPageTitle(pathname)}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Budget Pill — poin order + AI Point berdampingan */}
            {!isStaff && (
            <>
              <Link
                href="/dashboard/points"
                title="Point Order — 1 poin per order masuk"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
                style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}
              >
                <Coins size={15} style={{ color: 'var(--ds-fg-muted)' }} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] uppercase opacity-60" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>Budget</span>
                  <span className="text-sm" style={{ fontWeight: 700 }}>{profile?.me?.user?.user_points?.toLocaleString() ?? profile?.me?.user?.store_points?.toLocaleString() ?? 0}</span>
                </div>
              </Link>

              {/* AI Point — ikut berkurang seketika saat owner memakai fitur AI */}
              <Link
                href="/dashboard/points"
                title="AI Point — 1 poin per permintaan AI"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
                style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}
              >
                <Sparkles size={15} style={{ color: 'var(--ds-primary)' }} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] uppercase opacity-60" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>AI Point</span>
                  <span className="text-sm" style={{ fontWeight: 700 }}>{aiPoints.toLocaleString()}</span>
                </div>
              </Link>
            </>
            )}

            {/* Pembuka Manage OmBot AI — ditaruh di header agar sejajar dengan
                "Design With OmBot Ai" di editor halaman, bukan tombol melayang. */}
            {!isStaff && (
              <button
                onClick={() => openAiPanel('dashboard')}
                title="Tanya data toko ke Manage OmBot AI"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
                style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}
              >
                <Sparkles size={15} style={{ color: 'var(--ds-primary)' }} />
                <span className="text-sm" style={{ fontWeight: 600 }}>Manage OmBot AI</span>
              </button>
            )}

            <UserMenu
              userName={profile?.me?.user?.full_name ?? 'User'}
              storeName={profile?.me?.user?.store_name ?? 'Belum pilih toko'}
              storeImage={profile?.me?.user?.store_image ? resolveImageUrl(profile.me.user.store_image) : undefined}
              onLogout={handleLogout}
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
        <footer
          className="py-4 md:py-6 px-6 md:px-8 text-center lg:text-left"
          style={{ background: 'var(--ds-surface)', borderTop: '1px solid var(--ds-border)' }}
        >
          <div className="flex flex-col md:flex-row md:justify-between items-center gap-2 md:gap-4">
            <p className="text-xs" style={{ color: 'var(--ds-fg-muted)' }}>
              &copy; {new Date().getFullYear()} <span style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>OmBot</span>. Built with care for Indonesia.
            </p>
            <div className="flex items-center gap-3 text-[10px] uppercase" style={{ fontWeight: 600, letterSpacing: '0.08em', color: 'var(--ds-fg-muted)', opacity: 0.7 }}>
              <span>Efficiency</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'currentColor' }} />
              <span>Reliability</span>
              <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'currentColor' }} />
              <span>Growth</span>
            </div>
          </div>
        </footer>
        )}
      </div>

      {/* Manage OmBot AI — panel samping (split view), tampil di semua halaman
          /dashboard/*. Staff tidak melihatnya (staff diarahkan ke /chat). */}
      {!isStaff && <OmBotAiAssistance />}
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