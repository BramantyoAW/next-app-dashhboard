import { gqlFetchServer } from '@/lib/gql-server';
import { notFound } from 'next/navigation';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';
import StorefrontPuckRenderer from '@/components/storefront/StorefrontPuckRenderer';
import { isPuckStored, puckDataOf } from '@/lib/puckAdapter';

/**
 * Renders a full-page (Stitch-style) custom storefront page built with the
 * page builder — e.g. /storefront/<hash>/about, /storefront/<hash>/faq.
 *
 * Layout induk ((fullpage)/layout.tsx) sudah menyediakan tema tanpa navbar.
 * Di sini halaman dirender sebagai kanvas penuh: seluruh konten datang dari
 * blok (hero, text, products, cta, faq, custom, ...). Tidak ada judul
 * otomatis atau produk yang di-append — owner mengatur semuanya via blok.
 *
 * Format blok:
 *  - array → blok ombot lama (StorefrontPageRenderer)
 *  - { puck } → data Puck dari page builder (StorefrontPuckRenderer)
 */
export default async function StorefrontFullPage({
  params,
}: {
  params: Promise<{ hash: string; slug: string }>;
}) {
  const { hash, slug } = await params;

  const wsData = await gqlFetchServer<{
    webStoreByHash: {
      pages: { slug: string; title: string; blocks: unknown }[] | null;
    } | null;
  }>({
    query: `query($hash: String!) {
      webStoreByHash(hash: $hash) { pages { slug title blocks } }
    }`,
    variables: { hash },
  });
  const ws = wsData?.webStoreByHash;
  const pages = ws?.pages ?? [];
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();

  // Data Puck → render dgn Render Puck (client). Legacy array → renderer lama.
  if (isPuckStored(page.blocks)) {
    const puck = puckDataOf(page.blocks);
    if (puck) {
      return (
        <div className="min-h-screen">
          <StorefrontPuckRenderer data={puck} />
        </div>
      );
    }
  }
  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as { type: string; [key: string]: unknown }[];

  return (
    <div className="min-h-screen">
      {await StorefrontPageRenderer({ blocks, hash, products: [] })}
    </div>
  );
}
