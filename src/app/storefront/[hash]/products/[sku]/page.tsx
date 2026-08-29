import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { ProductActions } from '@/components/storefront/ProductActions';
import type { ProductAttribute } from '@/graphql/query/webstore';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  attributes: ProductAttribute[] | null;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
  variants?: Array<{ variant_key: string; image: string | null; price: number | null }>;
};

export default async function StorefrontProductPage({
  params,
}: {
  params: Promise<{ hash: string; sku: string }>;
}) {
  const { hash, sku } = await params;

  const data = await gqlFetchServer<{ storefrontProduct: SP | null }>({
    query: `query($slug: String!, $psku: String!) {
      storefrontProduct(web_store_slug: $slug, slug: $psku) {
        id price_override image is_active attributes
        variants { variant_key image price }
        master_product { id sku name description price image }
      }
    }`,
    variables: { slug: hash, psku: sku },
  });
  const sp = data?.storefrontProduct;
  if (!sp || !sp.is_active) notFound();

  // Image per varian (dari product_variant_stocks.image via field variants).
  const variantImages = (sp.variants ?? [])
    .filter(r => r.variant_key && r.image)
    .reduce<Record<string, string>>((acc, r) => {
      acc[r.variant_key] = r.image!;
      return acc;
    }, {});

  // Harga per varian (dari product_variant_stocks.price; fallback harga produk).
  const variantPrices = (sp.variants ?? [])
    .filter(r => r.variant_key && r.price != null)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.variant_key] = r.price!;
      return acc;
    }, {});

  const basePrice = sp.price_override ?? sp.master_product.price;
  const img = sp.image ?? sp.master_product.image;
  const hasVariant = Array.isArray(sp.attributes) && sp.attributes.length > 0;
  const baseItem = {
    store_product_id: sp.id,
    sku: sp.master_product.sku ?? '',
    name: sp.master_product.name,
    price: basePrice,
    image: img,
  };

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="overflow-hidden rounded-2xl bg-neutral-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={sp.master_product.name}
            className="h-full w-full object-cover"
            data-variant-image-root
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-neutral-400">no image</div>
        )}
      </div>
      <div>
        <nav className="mb-2 text-xs text-neutral-500">
          <Link href={`/storefront/${hash}`} className="hover:underline">Beranda</Link>
          <span className="mx-1">/</span>
          <span>{sp.master_product.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold">{sp.master_product.name}</h1>
        <div className="mt-1 text-sm text-neutral-500">SKU: {sp.master_product.sku}</div>
        <div
          className="mt-3 text-2xl font-bold"
          style={{ color: 'var(--brand)' }}
          data-variant-price-root
        >
          {formatIDR(basePrice)}
        </div>
        <div className="mt-4 prose prose-sm max-w-none text-neutral-700">
          {sp.master_product.description ?? 'Tidak ada deskripsi.'}
        </div>
        <div className="mt-6">
          {hasVariant ? (
            <ProductActions
              hash={hash}
              itemProps={baseItem}
              attributes={sp.attributes ?? []}
              variantImages={variantImages}
              variantPrices={variantPrices}
            />
          ) : (
            <div className="flex gap-2">
              <AddToCartButton hash={hash} item={baseItem} />
              <Link
                href={`/storefront/${hash}/cart?checkout=1`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Beli Sekarang
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
