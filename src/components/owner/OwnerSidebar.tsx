'use client';

/**
 * Sidebar owner — design system "Lembut Modern" (C).
 *
 * PERUBAHAN: hanya lapisan tampilan. Struktur menu, href, urutan, dan props
 * TIDAK berubah, jadi tidak ada route atau alur yang bergeser.
 *
 * Warna diambil dari token --ds-* / --primary di globals.css. Tidak ada lagi
 * kelas slate/blue hardcoded, supaya tema bisa diganti dari satu tempat.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Globe,
  Package,
  ShoppingCart,
  MessageCircle,
  Settings,
  LogOut,
  X,
  ArrowLeft,
  FileText,
  Ticket,
  FolderTree,
  MessageSquareQuote,
  Megaphone,
} from 'lucide-react';

const MAIN_NAV = [{ href: '/owner', label: 'Overview', icon: Home, exact: true }];

const WEB_STORE_NAV = [
  { href: '/owner/web-store', label: 'Setup', icon: Globe, exact: true },
  { href: '/owner/web-store/pages', label: 'Halaman (Builder)', icon: FileText },
  { href: '/owner/web-store/products', label: 'Master Products', icon: Package },
  { href: '/owner/web-store/categories', label: 'Kategori', icon: FolderTree },
  { href: '/owner/web-store/orders', label: 'Web Orders', icon: ShoppingCart },
  { href: '/owner/web-store/coupons', label: 'Kupon', icon: Ticket },
  { href: '/owner/web-store/reviews', label: 'Ulasan Produk', icon: MessageSquareQuote },
  { href: '/owner/web-store/broadcast', label: 'Broadcast Promo', icon: Megaphone },
];

export function OwnerSidebar({
  open,
  onClose,
  displayName,
  onLogout,
  desktopCollapsed = false,
}: {
  open: boolean;
  onClose: () => void;
  displayName?: string;
  onLogout: () => void;
  /** Desktop: sembunyikan sidebar (full-bleed editing). */
  desktopCollapsed?: boolean;
}) {
  const pathname = usePathname();

  const renderLink = (href: string, label: string, Icon: any, exact?: boolean) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 11px',
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          textDecoration: 'none',
          background: active ? 'var(--ds-surface-2)' : 'transparent',
          color: active ? 'var(--ds-fg)' : 'var(--ds-fg-muted)',
          transition: 'background-color .12s ease, color .12s ease',
        }}
        className="sidebar-link owner-nav-link relative"
        data-title={label}
      >
        <Icon size={17} style={{ flex: 'none', color: active ? 'var(--ds-primary)' : 'inherit' }} />
        <span className="sidebar-label" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,27,.32)', zIndex: 40 }}
          onClick={onClose}
          className="lg:hidden"
        />
      )}
      <aside
        style={{
          width: 264,
          flex: 'none',
          background: 'var(--ds-surface)',
          borderRight: '1px solid var(--ds-border)',
          padding: 16,
        }}
        data-collapsed={desktopCollapsed ? 'true' : 'false'}
        className={`ds-sidebar flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Link
            href="/owner"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <img src="/ombotico.png" width={32} height={32} alt="omBot" className="sidebar-logo" style={{ objectFit: 'contain' }} />
            <span className="sidebar-brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', color: 'var(--ds-fg)' }}>
                omBot
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 550,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ds-fg-muted)',
                }}
              >
                Owner Panel
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            style={{ background: 'none', border: 0, padding: 6, cursor: 'pointer', color: 'var(--ds-fg-muted)' }}
            className="lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Jalan kembali ke panel merchant */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="sidebar-back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 11px',
            marginBottom: 14,
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 550,
            textDecoration: 'none',
            color: 'var(--ds-fg-muted)',
            background: 'var(--ds-surface-2)',
            border: '1px solid var(--ds-border)',
          }}
        >
          <ArrowLeft size={13} />
          <span className="sidebar-label">Management Merchant</span>
        </Link>

        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MAIN_NAV.map((i) => renderLink(i.href, i.label, i.icon, i.exact))}

          <GroupLabel>Web Store</GroupLabel>
          {WEB_STORE_NAV.map((i) => renderLink(i.href, i.label, i.icon, i.exact))}

          <GroupLabel>Ops</GroupLabel>
          {renderLink('/owner/stores', 'Stores', Settings)}
          {renderLink('/chat', 'Messages', MessageCircle)}
        </nav>

        {/* Akun */}
        <div
          className="sidebar-profile"
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--ds-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--ds-primary)',
              color: 'var(--ds-primary-fg)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {displayName?.[0]?.toUpperCase() ?? 'O'}
          </div>
          <span
            className="sidebar-profile-text"
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              fontWeight: 550,
              color: 'var(--ds-fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName ?? 'Owner'}
          </span>
          <button
            onClick={onLogout}
            aria-label="Keluar"
            title="Keluar"
            style={{
              background: 'none',
              border: 0,
              padding: 6,
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--ds-fg-muted)',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sidebar-group"
      style={{
        padding: '16px 11px 5px',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--ds-fg-muted)',
      }}
    >
      <span>{children}</span>
    </div>
  );
}
