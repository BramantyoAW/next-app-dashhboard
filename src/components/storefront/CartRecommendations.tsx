'use client';
import { useEffect, useState } from 'react';
import { ProductCard, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import { loadCart } from '@/lib/cart';
import { gqlFetch } from '@/lib/graphqlClient';

/**
 * Rekomendasi produk di halaman keranjang — strip horizontal (slider geser).
 * Default & tidak customable: tampilkan produk toko selain yang ada di cart.
 */
export function CartRecommendations({ hash }: { hash: string }) {
  const [items, setItems] = useState<StorefrontProduct[]>([]);
  const [state, setState] = useState<'loading' | 'done'>('loading');

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
          { web_store_slug: hash, limit: 12 }
        );
        if (on) {
          const all = (res?.storefrontProducts ?? []).filter((p) => p.is_active !== false);
          setItems(all.filter((p) => !inCart.has(p.id)).slice(0, 10));
          setState('done');
        }
      } catch {
        if (on) setState('done');
      }
    })();
    return () => {
      on = false;
    };
  }, [hash]);

  if (state !== 'done' || items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          className="text-2xl font-medium tracking-tight"
          style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}
        >
          Mungkin Kamu Suka
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted, #6f6a63)' }}>
          Geser untuk lihat
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        <ul className="grid w-max grid-flow-col gap-x-5" style={{ gridAutoColumns: 'minmax(150px, 38vw) minmax(150px, 38vw)' }}>
          {items.map((p) => (
            <ProductCard key={p.id} hash={hash} p={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}
