import Link from 'next/link';
import { formatIDR } from '@/lib/cart';
import { productImage, productPrice } from '@/lib/storefront-ui';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { WishlistButton } from '@/components/storefront/WishlistButton';

export type StorefrontProduct = {
  id: string;
  price_override?: number | null;
  image?: string | null;
  is_active?: boolean;
  /** Optional badge label (owner can set in dashboard: "New", "Sale", "Best Seller"). */
  badge?: string | null;
  master_product?: {
    id?: string;
    sku?: string | null;
    name?: string;
    description?: string | null;
    price?: number | null;
    image?: string | null;
    category?: string | null;
  } | null;
};

/**
 * Product card — editorial Atelier.
 * 3:4 aspect, image+name link to PDP, standalone Add to Cart button below.
 */
export function ProductCard({ hash, p }: { hash: string; p: StorefrontProduct }) {
  const name = p.master_product?.name ?? 'Produk';
  const price = productPrice(p);
  const img = productImage(p);
  const slug = p.master_product?.sku ?? p.id;
  const href = `/storefront/${hash}/products/${slug}`;
  const badge = p.badge || null;
  const category = p.master_product?.category || null;

  return (
    <li className="group relative flex flex-col">
      {/* Gambar → link ke PDP */}
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--text,#161616)]/5">
          <StorefrontImage
            src={img}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {/* Badge overlay */}
          {badge && (
            <span
              className="absolute left-3 top-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: 'var(--text, #161616)', color: 'var(--bg, #faf9f6)' }}
            >
              {badge}
            </span>
          )}
          {/* Tombol hati wishlist — pojok kanan atas */}
          <WishlistButton hash={hash} storeProductId={p.id} className="absolute right-2.5 top-2.5" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {category && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--muted, #6f6a63)' }}
          >
            {category}
          </span>
        )}
        <Link href={href}>
          <h3
            className="text-[15px] font-semibold leading-snug transition-colors group-hover:text-[var(--brand)]"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--text, #161616)' }}
          >
            {name}
          </h3>
        </Link>
        <span
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: 'var(--text, #161616)' }}
        >
          {formatIDR(price)}
        </span>
        {/* Tombol add-to-cart mandiri (bukan di dalam link) */}
        <div className="mt-auto pt-2">
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
      </div>
    </li>
  );
}

export function ProductGrid({ hash, products, heading, count }: { hash: string; products: StorefrontProduct[]; heading?: string; count?: boolean }) {
  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--muted, #6f6a63)' }}>
          Belum ada produk untuk ditampilkan.
        </p>
      </div>
    );
  }

  return (
    <div>
      {heading && (
        <div className="mb-5 flex items-baseline justify-between">
          <h2
            className="text-2xl font-medium tracking-tight"
            style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}
          >
            {heading}
          </h2>
          {count && (
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--muted, #6f6a63)' }}
            >
              {products.length} products
            </span>
          )}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} hash={hash} p={p} />
        ))}
      </ul>
    </div>
  );
}
