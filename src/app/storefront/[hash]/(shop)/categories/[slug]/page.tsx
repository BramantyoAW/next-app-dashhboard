import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gqlFetchServer } from '@/lib/gql-server';
import { ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';

type Category = { id: string; name: string; slug: string | null };

export default async function StorefrontCategoryPage({
  params,
}: {
  params: Promise<{ hash: string; slug: string }>;
}) {
  const { hash, slug } = await params;

  const catData = await gqlFetchServer<{ storefrontCategories: Category[] | null }>({
    query: `query($web_store_slug: String!) {
      storefrontCategories(web_store_slug: $web_store_slug) { id name slug }
    }`,
    variables: { web_store_slug: hash },
  });
  const categories = catData?.storefrontCategories ?? [];
  const activeCat = categories.find((c) => c.slug === slug);

  const data = await gqlFetchServer<{ storefrontProductsByCategory: StorefrontProduct[] }>({
    query: `query($web_store_slug: String!, $category_slug: String!, $page: Int, $limit: Int) {
      storefrontProductsByCategory(web_store_slug: $web_store_slug, category_slug: $category_slug, page: $page, limit: $limit) {
        id price_override image is_active
        master_product { id sku name description price image }
      }
    }`,
    variables: { web_store_slug: hash, category_slug: slug, page: 1, limit: 50 },
  });
  const products = (data?.storefrontProductsByCategory ?? []).filter((p) => p.is_active);

  if (!activeCat) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-xs text-slate-400">
        <Link href={`/storefront/${hash}`} className="hover:underline">
          Beranda
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-600">{activeCat.name}</span>
      </nav>

      <section>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{activeCat.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{products.length} produk di kategori ini</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/storefront/${hash}/categories/${c.slug}`}
            className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              c.slug === slug
                ? 'border-transparent text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
            style={c.slug === slug ? { background: 'var(--brand, #111)' } : undefined}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <ProductGrid hash={hash} products={products} />
    </div>
  );
}
