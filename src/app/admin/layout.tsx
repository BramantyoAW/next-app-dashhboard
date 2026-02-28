'use client';

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Mail, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  CreditCard,
  History
} from "lucide-react";

function AdminSidebarLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))

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
      <span className="text-sm flex-1">{children}</span>
      {isActive && <ChevronRight size={14} className="opacity-50" />}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

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
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-xl text-blue-600">
              <LayoutDashboard size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-blue-600">OmBot Admin</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Management</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 hover:bg-secondary rounded-lg" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
          <AdminSidebarLink href="/admin/dashboard" icon={<LayoutDashboard size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Dashboard
          </AdminSidebarLink>
          <AdminSidebarLink href="/admin/users" icon={<Users size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Manage Users
          </AdminSidebarLink>
          <AdminSidebarLink href="/admin/stores" icon={<Store size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Manage Stores
          </AdminSidebarLink>
          <AdminSidebarLink href="/admin/email-history" icon={<Mail size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Email History
          </AdminSidebarLink>
          <AdminSidebarLink href="/admin/payment-history" icon={<History size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Payment History
          </AdminSidebarLink>

          <div className="pt-6 pb-2 px-4">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Settings</span>
          </div>
          <AdminSidebarLink href="/admin/settings/email" icon={<Mail size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Email (SMTP)
          </AdminSidebarLink>
          <AdminSidebarLink href="/admin/settings/midtrans" icon={<CreditCard size={18} />} onClick={() => setIsSidebarOpen(false)}>
            Midtrans Config
          </AdminSidebarLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors duration-200 font-semibold"
          >
            <LogOut size={18} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Admin specific simplified header for desktop) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-4 glass border-b border-border">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-slate-900 tracking-tight">OmBot Admin</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 animate-in relative">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
