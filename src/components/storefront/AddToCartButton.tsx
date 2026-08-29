'use client';
import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import type { CartItem } from '@/lib/cart';
import { addToCart } from '@/lib/cart';

export function AddToCartButton({ hash, item }: { hash: string; item: Omit<CartItem, 'qty'> }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        addToCart(hash, item, 1);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="flex w-full items-center justify-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
      style={{ background: 'var(--brand)' }}
    >
      {done ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      <span>{done ? 'Ditambahkan' : 'Tambah'}</span>
    </button>
  );
}
