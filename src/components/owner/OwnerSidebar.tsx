'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Globe, Package, Layers, ShoppingCart, MessageCircle, Settings, LogOut, X, ArrowLeft, FileText, Ticket, FolderTree } from 'lucide-react';

const MAIN_NAV = [
  { href: '/owner', label: 'Overview', icon: Home, exact: true },
];

const WEB_STORE_NAV = [
  { href: '/owner/web-store', label: 'Setup', icon: Globe },
  { href: '/owner/web-store/pages', label: 'Halaman (Builder)', icon: FileText },
  { href: '/owner/web-store/products', label: 'Master Products', icon: Package },
  { href: '/owner/web-store/categories', label: 'Kategori', icon: FolderTree },
  { href: '/owner/web-store/orders', label: 'Web Orders', icon: ShoppingCart },
  { href: '/owner/web-store/coupons', label: 'Kupon', icon: Ticket },
];

export function OwnerSidebar({
  open,
  onClose,
  displayName,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  displayName?: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const renderLink = (href: string, label: string, Icon: any, exact?: boolean) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={18} />
        {label}
      </Link>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-5 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto shadow-lg lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <Link href="/owner" className="flex items-center gap-3 group">
            <img src="/ombotico.png" className="w-10 h-10 object-contain" alt="omBot" />
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter text-slate-900">omBot</span>
              <span className="text-[9px] text-blue-600 uppercase tracking-widest font-bold">Owner Panel</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 hover:bg-slate-100 rounded-lg" onClick={onClose}>
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <Link
          href="/dashboard"
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Management Merchant
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {MAIN_NAV.map((i) => renderLink(i.href, i.label, i.icon, i.exact))}

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Web Store
            </span>
          </div>
          {WEB_STORE_NAV.map((i) => renderLink(i.href, i.label, i.icon))}

          <div className="pt-5 pb-1.5 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Ops
            </span>
          </div>
          {renderLink('/owner/stores', 'Stores', Settings)}
          {renderLink('/chat', 'Messages', MessageCircle)}
        </nav>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
              {displayName?.[0]?.toUpperCase() ?? 'O'}
            </div>
            <span className="text-sm font-semibold text-slate-800 truncate flex-1">
              {displayName ?? 'Owner'}
            </span>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
