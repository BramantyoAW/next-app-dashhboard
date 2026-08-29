'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react';
import {
  loadCart,
  setQty,
  removeFromCart,
  cartTotal,
  formatIDR,
  type CartItem,
} from '@/lib/cart';
import { getCustomerToken } from '@/lib/customer-token';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';

export function CartView({ hash, jumpToCheckout }: { hash: string; jumpToCheckout: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    setItems(loadCart(hash));
  }, [hash]);

  useEffect(() => {
    if (!jumpToCheckout) return;
    if (items.length === 0) return;
    router.replace(`/storefront/${hash}/checkout`);
  }, [jumpToCheckout, items.length, hash, router]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <ShoppingBag className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Keranjang kosong</h2>
        <p className="mt-1 text-sm text-slate-500">Yuk mulai belanja — produk favoritmu menunggu.</p>
        <Link
          href={`/storefront/${hash}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'var(--brand, #111)' }}
        >
          Lanjut Belanja
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const total = cartTotal(items);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.store_product_id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <StorefrontImage src={i.image} alt={i.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-semibold text-slate-800">{i.name}</div>
              {i.variant ? (
                <div className="mt-0.5 text-xs text-slate-500">Varian: {i.variant}</div>
              ) : null}
              <div className="mt-0.5 text-sm font-bold" style={{ color: 'var(--brand, #111)' }}>
                {formatIDR(i.price)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setItems(setQty(hash, i.store_product_id, i.qty - 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                aria-label="Kurangi"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
              <button
                onClick={() => setItems(setQty(hash, i.store_product_id, i.qty + 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tambah"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setItems(removeFromCart(hash, i.store_product_id))}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              aria-label="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">Ringkasan</h2>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-slate-500">Subtotal ({items.reduce((s, i) => s + i.qty, 0)} item)</span>
          <span className="font-bold text-slate-900">{formatIDR(total)}</span>
        </div>
        <button
          onClick={() => {
            const token = getCustomerToken();
            if (!token) {
              router.push(`/storefront/${hash}/sign-in?next=/storefront/${hash}/checkout`);
            } else {
              router.push(`/storefront/${hash}/checkout`);
            }
          }}
          className="mt-5 block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'var(--brand, #111)' }}
        >
          Lanjut ke Checkout
        </button>
        <Link
          href={`/storefront/${hash}`}
          className="mt-2 block text-center text-xs text-slate-500 hover:underline"
        >
          Lanjut Belanja
        </Link>
      </aside>
    </div>
  );
}
