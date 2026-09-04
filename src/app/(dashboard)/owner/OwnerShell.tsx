'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import { clearAuthToken } from '@/lib/auth';

export function OwnerShell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Builder & page editor = full-bleed: tanpa sidebar, header, navbar.
  const isBuilder = pathname.startsWith('/owner/web-store/pages');

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  if (isBuilder) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <OwnerSidebar
        open={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
        onLogout={handleLogout}
        desktopCollapsed={collapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} className="text-slate-700" />
            </button>
            <button
              className="hidden lg:inline-flex p-2 hover:bg-slate-100 rounded-xl text-slate-600"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar (full-bleed)'}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-800">
              Owner Console
            </span>
          </div>
          <span className="hidden sm:block text-sm text-slate-500 font-semibold">{displayName}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}