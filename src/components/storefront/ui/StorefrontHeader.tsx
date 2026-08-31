import Link from 'next/link';
import { Truck, ShieldCheck, MessageSquare, CreditCard } from 'lucide-react';
import { waLink } from '@/lib/storefront-ui';

/**
 * Storefront header (generic). Theme color comes from --brand (set by layout
 * from the web store's theme_color). Renders nav pages the owner published,
 * a search box, order link, cart badge and auth button.
 * Config dari `chrome.header` (Setup): search/orders bisa disembunyikan owner.
 */
export function StorefrontHeader({
  hash,
  storeName,
  logoUrl,
  brand,
  navPages,
  chrome,
}: {
  hash: string;
  storeName: string;
  logoUrl: string | null;
  brand: string;
  navPages: { slug: string; title: string }[];
  chrome?: { header: { show_search: boolean; show_orders: boolean } };
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href={`/storefront/${hash}`} className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: brand }}>
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-extrabold tracking-tight" style={{ color: brand }}>
            {storeName}
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex">
          {navPages.map((p) => (
            <Link key={p.slug} href={`/storefront/${hash}/${p.slug}`} className="rounded-lg px-2.5 py-1.5 hover:bg-slate-100 hover:text-slate-900">
              {p.title}
            </Link>
          ))}
        </nav>

        <form action={`/storefront/${hash}`} method="get" className="ml-auto hidden max-w-xs flex-1 sm:block">
          {(chrome?.header?.show_search ?? true) && (
            <input
              type="search"
              name="q"
              placeholder="Cari produk…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm outline-none transition focus:border-transparent focus:bg-white focus:ring-2"
              style={{ ['--tw-ring-color' as never]: brand }}
            />
          )}
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {(chrome?.header?.show_orders ?? true) && (
            <Link
              href={`/storefront/${hash}/account`}
              className="hidden rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-block"
            >
              Akun
            </Link>
          )}
          <CartBadge hash={hash} />
          <AuthButton hash={hash} />
        </div>
      </div>
    </header>
  );
}

/** Mobile search (visible under header on small screens). */
export function StorefrontMobileSearch({ hash, brand }: { hash: string; brand: string }) {
  return (
    <form action={`/storefront/${hash}`} method="get" className="px-4 pb-3 sm:hidden">
      <input
        type="search"
        name="q"
        placeholder="Cari produk…"
        className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:bg-white focus:ring-2"
        style={{ ['--tw-ring-color' as never]: brand }}
      />
    </form>
  );
}

/** Feature strip under the header — generic trust signals for any store. */
export function StorefrontFeatureStrip({ waPhone }: { waPhone: string | null | undefined }) {
  const wa = waLink(waPhone, 'Halo, saya ingin bertanya tentang produk Anda');
  const items = [
    { icon: <Truck className="h-4 w-4" />, label: 'Antar Cepat' },
    { icon: <ShieldCheck className="h-4 w-4" />, label: 'Aman & Terpercaya' },
    { icon: <CreditCard className="h-4 w-4" />, label: 'BCA · QRIS · COD' },
  ];
  if (wa) items.push({ icon: <MessageSquare className="h-4 w-4" />, label: 'Order via WhatsApp' });
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 text-xs font-medium text-slate-500">
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1.5">
            <span style={{ color: 'var(--brand, #111)' }}>{it.icon}</span>
            {it.label}
          </span>
        ))}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand, #111)' }}>
            <MessageSquare className="h-3.5 w-3.5" />
            Chat WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

import { StorefrontCartBadge as CartBadge } from '@/components/storefront/StorefrontCartBadge';
import { StorefrontAuthButton as AuthButton } from '@/components/storefront/StorefrontAuthButton';
