'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { loadCart } from '@/lib/cart';

export function StorefrontCartBadge({ hash }: { hash: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(loadCart(hash).reduce((s, i) => s + i.qty, 0));
    update();
    window.addEventListener('storefront-cart-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('storefront-cart-change', update);
      window.removeEventListener('storage', update);
    };
  }, [hash]);
  return (
    <Link
      href={`/storefront/${hash}/cart`}
      className="relative flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
      aria-label="Keranjang"
    >
      <ShoppingCart className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white" style={{ background: 'var(--brand, #111)' }}>
          {count}
        </span>
      )}
    </Link>
  );
}
