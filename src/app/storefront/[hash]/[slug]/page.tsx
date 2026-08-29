import { gqlFetchServer } from '@/lib/gql-server';
import { notFound } from 'next/navigation';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';
import { ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';

/**
 * Renders a custom dynamic storefront page built with the page builder
 * (e.g. /storefront/<hash>/about, /storefront/<hash>/faq).
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ hash: string; slug: string }>;
}) {
  const { hash, slug } = await params;

  const wsData = await gqlFetchServer<{
    webStoreByHash: { pages: { slug: string; title: string; blocks: unknown[] | null }[] | null } | null;
  }>({
    query: `query($hash: String!) {
      webStoreByHash(hash: $hash) { pages { slug title blocks } }
    }`,
    variables: { hash },
  });
  const pages = wsData?.webStoreByHash?.pages ?? [];
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();
  const blocks = (page.blocks ?? []) as { type: string; [key: string]: unknown }[];

  const data = await gqlFetchServer<{ storefrontProducts: StorefrontProduct[] }>({
    query: `query($slug: String!, $page: Int, $limit: Int) {
      storefrontProducts(web_store_slug: $slug, page: $page, limit: $limit) {
        id price_override image is_active
        master_product { id sku name description price image }
      }
    }`,
    variables: { slug: hash, page: 1, limit: 24 },
  });
  const products = (data?.storefrontProducts ?? []).filter((p) => p.is_active);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{page.title}</h1>
      {await StorefrontPageRenderer({ blocks, hash, products })}
      {products.length > 0 && (
        <section>
          <ProductGrid hash={hash} products={products} />
        </section>
      )}
    </div>
  );
}
