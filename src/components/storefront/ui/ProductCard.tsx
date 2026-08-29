import Link from 'next/link';
import { formatIDR } from '@/lib/cart';
import { productImage, productPrice } from '@/lib/storefront-ui';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';

export type StorefrontProduct = {
  id: string;
  price_override?: number | null;
  image?: string | null;
  is_active?: boolean;
  master_product?: {
    id?: string;
    sku?: string | null;
    name?: string;
    description?: string | null;
    price?: number | null;
    image?: string | null;
  } | null;
};

/**
 * Product card used on every storefront grid (home, categories, dynamic pages).
 * Generic — renders whatever product data the merchant's store returns.
 */
export function ProductCard({ hash, p }: { hash: string; p: StorefrontProduct }) {
  const name = p.master_product?.name ?? 'Produk';
  const price = productPrice(p);
  const img = productImage(p);
  const slug = p.master_product?.sku ?? p.id;
  const href = `/storefront/${hash}/products/${slug}`;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="aspect-square w-full overflow-hidden bg-slate-100">
          <StorefrontImage
            src={img}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-800 hover:underline">
          {name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--brand, #111)' }}>
            {formatIDR(price)}
          </span>
        </div>
        <AddToCartButton
          hash={hash}
          item={{
            store_product_id: p.id,
            sku: p.master_product?.sku ?? '',
            name,
            price,
            image: img,
          }}
        />
      </div>
    </li>
  );
}

export function ProductGrid({ hash, products }: { hash: string; products: StorefrontProduct[] }) {
  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center">
        <p className="text-sm font-medium text-slate-500">Belum ada produk untuk ditampilkan.</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} hash={hash} p={p} />
      ))}
    </ul>
  );
}
