import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import StorefrontShopShell from '@/components/storefront/StorefrontShopShell';

type Category = { id: string; name: string; slug: string | null };

/**
 * Katalog semua produk (/storefront/<hash>/products) — mode shell.
 * Dipakai sbg target menu "Produk" header (rute khusus, bukan PDP slug).
 */
export default async function StorefrontProductsPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  const [prodData, catData] = await Promise.all([
    gqlFetchServer<{ storefrontProducts: StorefrontProduct[] | null }>({
      query: `query($web_store_slug: String!, $page: Int, $limit: Int) {
        storefrontProducts(web_store_slug: $web_store_slug, page: $page, limit: $limit) {
          id price_override image is_active
          master_product { id sku name description price image }
        }
      }`,
      variables: { web_store_slug: hash, page: 1, limit: 100 },
    }),
    gqlFetchServer<{ storefrontCategories: Category[] | null }>({
      query: `query($web_store_slug: String!) {
        storefrontCategories(web_store_slug: $web_store_slug) { id name slug }
      }`,
      variables: { web_store_slug: hash },
    }),
  ]);

  const products = (prodData?.storefrontProducts ?? []).filter((p) => p.is_active !== false);
  const categories = catData?.storefrontCategories ?? [];

  return (
    <StorefrontShopShell hash={hash}>
      <div className="space-y-6">
        <nav className="flex items-center gap-1 text-xs text-slate-400">
          <Link href={`/storefront/${hash}`} className="hover:underline">
            Beranda
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-600">Produk</span>
        </nav>

        <section>
          <h1 className="text-3xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}>
            Semua Produk
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted, #6f6a63)' }}>
            {products.length} produk
          </p>
        </section>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/storefront/${hash}/categories/${c.slug}`}
                className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition"
                style={{ borderColor: 'var(--line, rgba(22,22,22,0.2))', color: 'var(--muted, #6f6a63)' }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <ProductGrid hash={hash} products={products} />
      </div>
    </StorefrontShopShell>
  );
}
