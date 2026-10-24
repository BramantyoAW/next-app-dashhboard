'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { gqlFetch } from '@/lib/graphqlClient';
import { getCustomerToken } from '@/lib/customer-token';

// Cache wishlist ids per hash (module-level) supaya tiap kartu tidak bolak-
// balik query wishlistProductIds saat pertama render.
const cache: Record<string, Set<string> | undefined> = {};

/**
 * Ikon hati wishlist utk kartu produk & PDP. Self-contained:
 * - Login → toggle add/remove wishlist.
 * - Belum login → arahkan ke sign-in (next kembali).
 */
export function WishlistButton({ hash, storeProductId, className = '' }: {
  hash: string;
  storeProductId: string;
  className?: string;
}) {
  const router = useRouter();
  const [wished, setWished] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // Inisialisasi: kalau login, ambil daftar id favorit utk toko ini (cache).
  useEffect(() => {
    let alive = true;
    const token = getCustomerToken();
    if (!token) {
      setWished(false);
      return;
    }
    if (cache[hash]) {
      setWished(cache[hash]!.has(storeProductId));
      return;
    }
    gqlFetch<{ wishlistProductIds: string[] }>(
      `query($slug: String!) { wishlistProductIds(web_store_slug: $slug) }`,
      { slug: hash },
      token,
    )
      .then((d) => {
        cache[hash] = new Set((d.wishlistProductIds ?? []).map(String));
        if (alive) setWished(cache[hash]!.has(storeProductId));
      })
      .catch(() => { if (alive) setWished(false); });
    return () => { alive = false; };
  }, [hash, storeProductId]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token = getCustomerToken();
    if (!token) {
      // Bangun next sebagai path storefront PENUH (aman utk safeNextPath),
      // supaya setelah login guest kembali ke halaman asal.
      const path = window.location.pathname;
      const next = path.startsWith(`/storefront/${hash}/`)
        ? path
        : `/storefront/${hash}${path === '/' ? '' : path}`;
      router.push(`/storefront/${hash}/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    if (busy || wished === null) return;
    setBusy(true);
    const optimistic = !wished;
    try {
      if (optimistic) {
        await gqlFetch(`mutation($id: ID!) { wishlistAdd(store_product_id: $id) }`, { id: storeProductId }, token);
      } else {
        await gqlFetch(`mutation($id: ID!) { wishlistRemove(store_product_id: $id) }`, { id: storeProductId }, token);
      }
      cache[hash] = cache[hash] ?? new Set();
      optimistic ? cache[hash]!.add(storeProductId) : cache[hash]!.delete(storeProductId);
      setWished(optimistic);
    } catch (err: any) {
      console.error('wishlist toggle gagal', err?.message || err);
    } finally {
      setBusy(false);
    }
  }, [hash, storeProductId, wished, busy, router]);

  const on = wished === true;
  return (
    <button
      type="button"
      aria-label={on ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      title={on ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      onClick={toggle}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105 ${busy ? 'opacity-60' : ''} ${className}`}
    >
      <Heart className={`h-[18px] w-[18px] transition ${on ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
    </button>
  );
}
