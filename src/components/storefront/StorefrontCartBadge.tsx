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
      className="relative flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-neutral-100"
      aria-label="Keranjang"
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="ml-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
