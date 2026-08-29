'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import {
  loadCart,
  setQty,
  removeFromCart,
  cartTotal,
  formatIDR,
  type CartItem,
} from '@/lib/cart';
import { getCustomerToken } from '@/lib/customer-token';

export function CartView({ hash, jumpToCheckout }: { hash: string; jumpToCheckout: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    setItems(loadCart(hash));
  }, [hash]);

  // Redirect to checkout when arriving with ?checkout=1 and cart non-empty
  useEffect(() => {
    if (!jumpToCheckout) return;
    if (items.length === 0) return;
    router.replace(`/storefront/${hash}/checkout`);
  }, [jumpToCheckout, items.length, hash, router]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-neutral-50 p-10 text-center">
        <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-neutral-400" />
        <h2 className="text-lg font-semibold">Keranjang kosong</h2>
        <p className="mt-1 text-sm text-neutral-500">Yuk mulai belanja.</p>
        <Link
          href={`/storefront/${hash}`}
          className="mt-4 inline-block rounded-lg px-4 py-2 text-sm text-white"
          style={{ background: 'var(--brand)' }}
        >
          Lanjut Belanja
        </Link>
      </div>
    );
  }

  const total = cartTotal(items);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.store_product_id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="line-clamp-1 text-sm font-medium">{i.name}</div>
              {i.variant ? (
                <div className="text-xs text-neutral-500">Varian: {i.variant}</div>
              ) : null}
              <div className="text-xs text-neutral-500">{formatIDR(i.price)}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setItems(setQty(hash, i.store_product_id, i.qty - 1))}
                className="rounded-md border p-1 hover:bg-neutral-50"
                aria-label="Kurangi"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm">{i.qty}</span>
              <button
                onClick={() => setItems(setQty(hash, i.store_product_id, i.qty + 1))}
                className="rounded-md border p-1 hover:bg-neutral-50"
                aria-label="Tambah"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={() => setItems(removeFromCart(hash, i.store_product_id))}
              className="rounded-md p-1 text-red-500 hover:bg-red-50"
              aria-label="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-xl border bg-white p-4">
        <div className="flex justify-between text-sm">
          <span>Total</span>
          <span className="font-semibold">{formatIDR(total)}</span>
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
          className="mt-4 block w-full rounded-lg py-2 text-center text-sm font-medium text-white"
          style={{ background: 'var(--brand)' }}
        >
          Lanjut ke Checkout
        </button>
        <Link
          href={`/storefront/${hash}`}
          className="mt-2 block text-center text-xs text-neutral-500 hover:underline"
        >
          Lanjut Belanja
        </Link>
      </aside>
    </div>
  );
}
