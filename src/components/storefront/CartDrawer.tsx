'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Minus, Plus, Trash2, X, ShoppingBag, ChevronRight } from 'lucide-react';
import { loadCart, setQty, removeFromCart, cartTotal, formatIDR, type CartItem } from '@/lib/cart';
import { getCustomerToken } from '@/lib/customer-token';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { ProductCard, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import { gqlFetch } from '@/lib/graphqlClient';

/* ---------- Context global: buka/tutup drawer dari mana saja ---------- */
const CartDrawerCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useCartDrawer = () => useContext(CartDrawerCtx);

/** Rekomendasi kecil di dalam drawer — produk lain selain di cart. */
function DrawerRecs({ hash }: { hash: string }) {
  const [items, setItems] = useState<StorefrontProduct[]>([]);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const inCart = new Set(loadCart(hash).map((i) => i.store_product_id));
        const res = await gqlFetch<{ storefrontProducts: StorefrontProduct[] | null }>(
          `query($web_store_slug: String!, $limit: Int) {
            storefrontProducts(web_store_slug: $web_store_slug, limit: $limit) {
              id price_override image is_active
              master_product { id sku name description price image }
            }
          }`,
          { web_store_slug: hash, limit: 10 }
        );
        if (on) {
          const all = (res?.storefrontProducts ?? []).filter((p) => p.is_active !== false);
          setItems(all.filter((p) => !inCart.has(p.id)).slice(0, 6));
        }
      } catch {
        /* diam */
      }
    })();
    return () => {
      on = false;
    };
  }, [hash]);

  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--line, rgba(22,22,22,0.12))' }}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted, #6f6a63)' }}>
        Mungkin Kamu Suka
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((p) => {
          const name = p.master_product?.name ?? 'Produk';
          const price = p.price_override ?? p.master_product?.price ?? 0;
          const img = p.image || p.master_product?.image || '';
          const slug = p.master_product?.sku ?? p.id;
          return (
            <Link
              key={p.id}
              href={`/storefront/${hash}/products/${slug}`}
              className="w-[104px] shrink-0 snap-start"
              onClick={() => window.dispatchEvent(new CustomEvent('storefront-cart-drawer-close'))}
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-[var(--text)]/5">
                <StorefrontImage src={img} alt={name} className="h-full w-full object-cover" />
              </div>
              <div className="mt-1.5 truncate text-xs font-semibold" style={{ color: 'var(--text, #161616)' }}>
                {name}
              </div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text, #161616)' }}>
                {formatIDR(price)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CartDrawerProvider({ hash, children }: { hash: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const router = useRouter();

  const refresh = useCallback(() => setItems(loadCart(hash)), [hash]);
  useEffect(() => {
    refresh();
    window.addEventListener('storefront-cart-change', refresh);
    const close = () => setIsOpen(false);
    window.addEventListener('storefront-cart-drawer-close', close);
    return () => {
      window.removeEventListener('storefront-cart-change', refresh);
      window.removeEventListener('storefront-cart-drawer-close', close);
    };
  }, [refresh]);

  // Kunci scroll body saat drawer terbuka
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const open = useCallback(() => { refresh(); setIsOpen(true); }, [refresh]);
  const close = useCallback(() => setIsOpen(false), []);
  const ctx = useMemo(() => ({ open }), [open]);
  const total = cartTotal(items);

  const goCheckout = () => {
    setIsOpen(false);
    const token = getCustomerToken();
    router.push(token ? `/storefront/${hash}/checkout` : `/storefront/${hash}/sign-in?next=/storefront/${hash}/checkout`);
  };

  return (
    <CartDrawerCtx.Provider value={ctx}>
      {children}

      {/* Overlay + tray geser dari kanan */}
      <div
        aria-hidden={!isOpen}
        onClick={close}
        className={`fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="Keranjang"
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Head */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line, rgba(22,22,22,0.12))' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}>
            Keranjang ({items.reduce((s, i) => s + i.qty, 0)})
          </h2>
          <button onClick={close} aria-label="Tutup" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <ShoppingBag className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Keranjang kosong</p>
              <p className="mt-1 text-xs text-slate-500">Yuk mulai belanja — produk favoritmu menunggu.</p>
              <Link
                href={`/storefront/${hash}`}
                onClick={close}
                className="mt-5 inline-flex items-center gap-1 rounded-full px-5 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'var(--brand, #161616)' }}
              >
                Mulai Belanja
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((i) => (
                  <li key={i.store_product_id} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: 'var(--line, rgba(22,22,22,0.12))' }}>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <StorefrontImage src={i.image} alt={i.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-semibold text-slate-800">{i.name}</div>
                      {i.variant ? <div className="text-xs text-slate-500">Varian: {i.variant}</div> : null}
                      <div className="mt-0.5 text-sm font-bold" style={{ color: 'var(--text, #161616)' }}>{formatIDR(i.price)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setItems(setQty(hash, i.store_product_id, i.qty - 1))} aria-label="Kurangi" className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{i.qty}</span>
                        <button onClick={() => setItems(setQty(hash, i.store_product_id, i.qty + 1))} aria-label="Tambah" className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => setItems(removeFromCart(hash, i.store_product_id))} aria-label="Hapus" className="text-slate-400 transition hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Slider rekomendasi di dalam tray */}
              <DrawerRecs hash={hash} />
            </>
          )}
        </div>

        {/* Footer tray */}
        {items.length > 0 && (
          <div className="border-t px-5 py-4" style={{ borderColor: 'var(--line, rgba(22,22,22,0.12))' }}>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-base font-bold" style={{ color: 'var(--text, #161616)' }}>{formatIDR(total)}</span>
            </div>
            <button
              onClick={goCheckout}
              className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand, #161616)' }}
            >
              Lanjut ke Checkout
            </button>
          </div>
        )}
      </aside>
    </CartDrawerCtx.Provider>
  );
}
