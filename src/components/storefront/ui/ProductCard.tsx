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
 * Product card — editorial design.
 * 3:4 aspect ratio, serif name, badge overlay, subtle hover.
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
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--text,#17150f)]/5">
          <StorefrontImage
            src={img}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {/* Badge overlay */}
          {badge && (
            <span
              className="absolute left-3 top-3 bg-[var(--bg,#f4f1ea)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text, #17150f)' }}
            >
              {badge}
            </span>
          )}
          {/* Quick add — visible on hover */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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
      </Link>

      <div className="flex flex-col gap-0.5 pt-3">
        {category && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--muted, #7a7568)' }}
          >
            {category}
          </span>
        )}
        <Link href={href}>
          <h3
            className="text-sm font-medium leading-snug transition-colors group-hover:text-[var(--brand)]"
            style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
          >
            {name}
          </h3>
        </Link>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: 'var(--brand, #8a6f4d)' }}
        >
          {formatIDR(price)}
        </span>
      </div>
    </li>
  );
}

export function ProductGrid({ hash, products, heading, count }: { hash: string; products: StorefrontProduct[]; heading?: string; count?: boolean }) {
  if (!products || products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--muted, #7a7568)' }}>
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
            className="text-xl font-medium tracking-tight"
            style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
          >
            {heading}
          </h2>
          {count && (
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--muted, #7a7568)' }}
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
