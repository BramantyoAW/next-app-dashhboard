import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { productImage, productPrice, waLink } from '@/lib/storefront-ui';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { ProductActions } from '@/components/storefront/ProductActions';
import { ProductGrid } from '@/components/storefront/ui/ProductCard';
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

type Store = {
  notify_whatsapp: string | null;
  store_name: string;
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

  const store = await gqlFetchServer<{ webStoreByHash: Store | null }>({
    query: `query($hash: String!) {
      webStoreByHash(hash: $hash) { notify_whatsapp store_name }
    }`,
    variables: { hash },
  });
  const waPhone = store?.webStoreByHash?.notify_whatsapp ?? null;
  const storeName = store?.webStoreByHash?.store_name ?? 'Toko';

  const variantImages = (sp.variants ?? [])
    .filter((r) => r.variant_key && r.image)
    .reduce<Record<string, string>>((acc, r) => {
      acc[r.variant_key] = r.image!;
      return acc;
    }, {});

  const variantPrices = (sp.variants ?? [])
    .filter((r) => r.variant_key && r.price != null)
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

  const waText = `Halo ${storeName}, saya mau pesan:\n- ${sp.master_product.name} (${formatIDR(basePrice)})\nBisa dibantu?`;
  const waHref = waLink(waPhone, waText);

  // Related products: same category when available, else newest of the store.
  const related = await gqlFetchServer<{ storefrontProducts: SP[] }>({
    query: `query($slug: String!, $limit: Int) {
      storefrontProducts(web_store_slug: $slug, limit: $limit) {
        id price_override image is_active
        master_product { id sku name description price image }
      }
    }`,
    variables: { slug: hash, limit: 5 },
  });
  const relatedProducts = (related?.storefrontProducts ?? [])
    .filter((p) => p.is_active && p.id !== sp.id)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <article className="grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-square w-full">
            {img ? (
              <StorefrontImage
                src={img}
                alt={sp.master_product.name}
                className="h-full w-full object-cover"
                priority
                data-variant-image-root={undefined}
              />
            ) : (
              <StorefrontImage src={null} alt={sp.master_product.name} className="h-full w-full object-cover" priority />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link href={`/storefront/${hash}`} className="hover:underline">
              Beranda
            </Link>
            <span>/</span>
            <span className="text-slate-600">{sp.master_product.name}</span>
          </nav>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {sp.master_product.name}
          </h1>
          {sp.master_product.sku && (
            <div className="mt-1 text-xs font-medium text-slate-400">SKU: {sp.master_product.sku}</div>
          )}

          <div
            className="mt-4 text-3xl font-black tracking-tight"
            style={{ color: 'var(--brand, #111)' }}
            data-variant-price-root
          >
            {formatIDR(basePrice)}
          </div>

          <div className="mt-5 max-w-prose text-sm leading-relaxed text-slate-600">
            {sp.master_product.description ?? 'Tidak ada deskripsi produk.'}
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
              <div className="flex flex-wrap gap-2">
                <AddToCartButton hash={hash} item={baseItem} />
                <Link
                  href={`/storefront/${hash}/cart?checkout=1`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Beli Sekarang
                </Link>
              </div>
            )}
          </div>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
              </svg>
              Order via WhatsApp
            </a>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-500">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm">🚚</div>
              Antar Cepat
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm">🔒</div>
              Pembayaran Aman
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm">✅</div>
              Pesanan Terverifikasi
            </div>
          </div>
        </div>
      </article>

      {relatedProducts.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-900">Produk Lainnya</h2>
          <ProductGrid hash={hash} products={relatedProducts} />
        </section>
      )}
    </div>
  );
}
