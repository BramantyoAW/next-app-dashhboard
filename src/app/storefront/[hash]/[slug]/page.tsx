import {
  gqlFetchServer,
} from '@/lib/gql-server';
import { notFound } from 'next/navigation';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

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
  if (!page) {
    notFound();
  }
  const blocks = (page.blocks ?? []) as { type: string; [key: string]: unknown }[];

  // Fetch products too so a `products` block on any page works.
  const data = await gqlFetchServer<{ storefrontProducts: SP[] }>({
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
    <div>
      <h1 className="mb-5 text-xl font-bold text-slate-900">{page.title}</h1>
      {await StorefrontPageRenderer({ blocks, hash, products })}
    </div>
  );
}