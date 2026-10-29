'use client';

/**
 * Shell owner — design system "Lembut Modern" (C).
 *
 * PERUBAHAN: hanya tampilan topbar & spacing. Logika tidak berubah:
 *  - isBuilder → full-bleed (tanpa sidebar/header); daftar prefix eksplisit
 *    di FULL_BLEED_PREFIXES
 *  - collapse sidebar desktop tetap sama
 *  - logout tetap sama
 */
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import { clearAuthToken } from '@/lib/auth';

// Daftar prefix eksplisit (bukan startsWith melebar) — tiap entri punya navigasi
// sendiri (tombol "Kembali ke Setup"), jadi tidak butuh chrome.
const FULL_BLEED_PREFIXES = ['/owner/web-store/pages', '/owner/web-store/builder'];

export function OwnerShell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Builder & page editor = full-bleed: tanpa sidebar, header, navbar.
  const isBuilder = FULL_BLEED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  if (isBuilder) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--ds-bg)' }}>{children}</main>
    );
  }

  // `display` sengaja TIDAK di sini: inline style menang atas kelas Tailwind,
  // sehingga `hidden` / `lg:hidden` tidak akan pernah berlaku. Display diatur
  // per tombol lewat kelas.
  const iconBtn = {
    placeItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 9,
    border: '1px solid var(--ds-border)',
    background: 'var(--ds-surface)',
    color: 'var(--ds-fg-muted)',
    cursor: 'pointer',
  } as const;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--ds-bg)', color: 'var(--ds-fg)' }}>
      <OwnerSidebar
        open={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
        onLogout={handleLogout}
        desktopCollapsed={collapsed}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            background: 'color-mix(in srgb, var(--ds-surface) 88%, transparent)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              style={iconBtn}
              className="grid lg:hidden"
            >
              <Menu size={17} />
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              title={collapsed ? 'Tampilkan sidebar' : 'Kecilkan sidebar jadi ikon'}
              style={iconBtn}
              className="hidden lg:grid"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Owner Console</span>
          </div>

          <span style={{ fontSize: 12.5, color: 'var(--ds-fg-muted)', fontWeight: 500 }} className="hidden sm:block">
            {displayName}
          </span>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 48px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
