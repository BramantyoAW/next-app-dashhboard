'use client';

import Link from 'next/link';
import { StorefrontCartBadge } from '@/components/storefront/StorefrontCartBadge';
import { Home, User, MessageCircle } from 'lucide-react';

/**
 * Floating mini-bar untuk halaman full-page (mode Stitch).
 * Muncul pojok kanan-bawah, menyatu dengan tema (var(--text) & var(--brand)).
 * Memberi akses ke home, akun, keranjang, dan WhatsApp — tanpa navbar penuh.
 */
export function FullPageMiniBar({
  hash,
  storeName,
  waPhone,
}: {
  hash: string;
  storeName: string;
  waPhone?: string | null;
}) {
  const wa = waPhone
    ? `https://wa.me/${waPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${storeName}, saya ingin bertanya tentang produk Anda.`)}`
    : null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-1 shadow-xl"
      style={{ background: 'var(--text, #17150f)', color: 'var(--brand-contrast, #ffffff)' }}
    >
      <Link
        href={`/storefront/${hash}`}
        aria-label="Beranda"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <Home size={16} />
      </Link>
      <Link
        href={`/storefront/${hash}/account`}
        aria-label="Akun"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <User size={16} />
      </Link>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat WhatsApp"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <MessageCircle size={16} />
        </a>
      )}
      <span className="mx-0.5 h-5 w-px bg-white/20" />
      <StorefrontCartBadge hash={hash} />
    </div>
  );
}
