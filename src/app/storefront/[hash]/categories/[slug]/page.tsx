import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

type Category = {
  id: string;
  name: string;
  slug: string | null;
};

export default async function StorefrontCategoryPage({
  params,
}: {
  params: Promise<{ hash: string; slug: string }>;
}) {
  const { hash, slug } = await params;

  // Kategori aktif untuk judul + fallback.
  const catData = await gqlFetchServer<{ storefrontCategories: Category[] | null }>({
    query: `query($web_store_slug: String!) {
      storefrontCategories(web_store_slug: $web_store_slug) {
        id name slug
      }
    }`,
    variables: { web_store_slug: hash },
  });
  const activeCat = (catData?.storefrontCategories ?? []).find((c) => c.slug === slug);

  // Produk yang masuk kategori ini.
  const data = await gqlFetchServer<{ storefrontProductsByCategory: SP[] }>({
    query: `query($web_store_slug: String!, $category_slug: String!, $page: Int, $limit: Int) {
      storefrontProductsByCategory(web_store_slug: $web_store_slug, category_slug: $category_slug, page: $page, limit: $limit) {
        id price_override image is_active
        master_product { id sku name description price image }
      }
    }`,
    variables: { web_store_slug: hash, category_slug: slug, page: 1, limit: 50 },
  });
  const products = (data?.storefrontProductsByCategory ?? []).filter((p) => p.is_active);

  // Kategori tidak aktif/valid di web store ini — treat as not found.
  if (!activeCat) notFound();

  return (
    <div>
      <nav className="mb-4 text-xs text-neutral-500">
        <Link href={`/storefront/${hash}`} className="hover:underline">
          Beranda
        </Link>
        <span className="mx-1">/</span>
        <span>{activeCat.name}</span>
      </nav>

      <section className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{activeCat.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {products.length} produk di kategori ini
        </p>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {catData?.storefrontCategories?.map((c) => (
          <Link
            key={c.id}
            href={`/storefront/${hash}/categories/${c.slug}`}
            className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              c.slug === slug
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
          Belum ada produk dalam kategori ini.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const price = p.price_override ?? p.master_product.price;
            const img = p.image ?? p.master_product.image ?? null;
            return (
              <li key={p.id} className="group rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md">
                <Link href={`/storefront/${hash}/products/${p.master_product.sku ?? p.id}`} className="block">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.master_product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-neutral-400">no image</div>
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.master_product.name}</h3>
                  <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                    {formatIDR(price)}
                  </div>
                </Link>
                <div className="mt-2">
                  <AddToCartButton
                    hash={hash}
                    item={{
                      store_product_id: p.id,
                      sku: p.master_product.sku ?? '',
                      name: p.master_product.name,
                      price,
                      image: img,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}