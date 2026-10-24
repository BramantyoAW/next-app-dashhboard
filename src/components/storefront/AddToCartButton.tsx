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
      className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ background: 'var(--brand)' }}
    >
      {done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      <span>{done ? 'Ditambahkan' : 'Tambah'}</span>
    </button>
  );
}
