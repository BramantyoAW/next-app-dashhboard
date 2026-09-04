import Link from 'next/link';
import { Truck, ShieldCheck, MessageSquare, CreditCard, Search } from 'lucide-react';
import { waLink } from '@/lib/storefront-ui';

/**
 * Storefront header — editorial/clean design.
 * Theme color comes from --brand (set by layout).
 * Renders nav pages the owner published, a search box, order link, cart badge and auth button.
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
    <header className="sticky top-0 z-40 border-b border-[var(--text,#17150f)]/10 bg-[var(--bg,#f4f1ea)]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo / brand */}
        <Link href={`/storefront/${hash}`} className="flex min-w-0 items-center gap-2.5 py-4">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt={storeName} className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : null}
          <span
            className="truncate text-base font-bold uppercase tracking-[0.14em]"
            style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
          >
            {storeName}
          </span>
        </Link>

        {/* Navigation — desktop */}
        <nav className="ml-auto hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.18em] md:flex">
          {navPages.map((p) => (
            <Link
              key={p.slug}
              href={`/storefront/${hash}/${p.slug}`}
              className="py-4 transition-colors hover:text-[var(--brand)]"
              style={{ color: 'var(--muted, #7a7568)' }}
            >
              {p.title}
            </Link>
          ))}
        </nav>

        {/* Search + account + cart — desktop */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {(chrome?.header?.show_search ?? true) && (
            <form action={`/storefront/${hash}`} method="get" className="relative">
              <input
                type="search"
                name="q"
                placeholder="Search"
                className="w-44 border-b border-current/20 bg-transparent py-1.5 pr-7 pl-0 text-[12px] uppercase tracking-widest placeholder:opacity-50 focus:border-[var(--brand)] focus:outline-none"
                style={{ color: 'var(--text, #17150f)' }}
              />
              <Search size={14} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-40" />
            </form>
          )}

          {(chrome?.header?.show_orders ?? true) && (
            <Link
              href={`/storefront/${hash}/account`}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--brand)]"
              style={{ color: 'var(--muted, #7a7568)' }}
            >
              Akun
            </Link>
          )}

          <CartBadge hash={hash} />
        </div>

        {/* Mobile: cart + hamburger-style area */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <CartBadge hash={hash} />
        </div>
      </div>

      {/* Mobile search — below header on small screens */}
    </header>
  );
}

/** Mobile search (visible under header on small screens). */
export function StorefrontMobileSearch({ hash, brand }: { hash: string; brand: string }) {
  return (
    <form action={`/storefront/${hash}`} method="get" className="border-b border-[var(--text,#17150f)]/5 px-4 py-2.5 sm:hidden">
      <div className="relative">
        <input
          type="search"
          name="q"
          placeholder="Search products…"
          className="w-full border-b border-current/20 bg-transparent py-2 pr-7 pl-0 text-[12px] uppercase tracking-widest placeholder:opacity-50 focus:border-[var(--brand)] focus:outline-none"
          style={{ color: 'var(--text, #17150f)' }}
        />
        <Search size={14} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-40" />
      </div>
    </form>
  );
}

/** Feature strip under the header — editorial trust signals. */
export function StorefrontFeatureStrip({ waPhone }: { waPhone: string | null | undefined }) {
  const wa = waLink(waPhone, 'Halo, saya ingin bertanya tentang produk Anda');
  const items = [
    { icon: <Truck className="h-3.5 w-3.5" />, label: 'Pengiriman Cepat' },
    { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Garansi Original' },
    { icon: <CreditCard className="h-3.5 w-3.5" />, label: 'Bayar di Tempat' },
  ];
  if (wa) items.push({ icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Chat Kami' });

  return (
    <div className="border-b border-[var(--text,#17150f)]/10 bg-[var(--bg,#f4f1ea)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
        {items.map((it) => (
          <span
            key={it.label}
            className="inline-flex items-center gap-1.5"
            style={{ color: 'var(--muted, #7a7568)' }}
          >
            <span style={{ color: 'var(--brand, #8a6f4d)' }}>{it.icon}</span>
            {it.label}
          </span>
        ))}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--brand, #8a6f4d)' }}
          >
            <MessageSquare className="h-3 w-3" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

import { StorefrontCartBadge as CartBadge } from '@/components/storefront/StorefrontCartBadge';
import { StorefrontAuthButton as AuthButton } from '@/components/storefront/StorefrontAuthButton';
