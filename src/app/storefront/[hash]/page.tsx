import Link from 'next/link';
import type { CSSProperties } from 'react';
import { gqlFetchServer } from '@/lib/gql-server';
import { formatIDR } from '@/lib/cart';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

export default async function StorefrontHome({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ q?: string; min?: string; max?: string; page?: string }>;
}) {
  const { hash } = await params;
  const { q = '', min = '', max = '', page = '1' } = await searchParams;

  const wsData = await gqlFetchServer<{
    webStoreByHash: {
      banner_url: string | null;
      tagline: string | null;
      pages: { slug: string; blocks: unknown[] | null }[] | null;
    } | null;
  }>({
    query: `query($hash: String!) {
      webStoreByHash(hash: $hash) {
        banner_url tagline
        pages { slug blocks }
      }
    }`,
    variables: { hash },
  });
  const banner = wsData?.webStoreByHash?.banner_url ?? null;
  const tagline = wsData?.webStoreByHash?.tagline ?? null;
  // Dynamic blocks for the home page (if the owner set up the page builder).
  const homePage = wsData?.webStoreByHash?.pages?.find((p) => p.slug === 'home');
  const blocks = (homePage?.blocks ?? null) as { type: string; [key: string]: unknown }[] | null;

  // Kategori storefront (anon) untuk chip/filter navigasi.
  const catData = await gqlFetchServer<{
    storefrontCategories: { id: string; name: string; slug: string | null }[] | null;
  }>({
    query: `query($web_store_slug: String!) {
      storefrontCategories(web_store_slug: $web_store_slug) {
        id name slug
      }
    }`,
    variables: { web_store_slug: hash },
  });
  const categories = (catData?.storefrontCategories ?? []).filter((c) => c.slug);

  const data = await gqlFetchServer<{ storefrontProducts: SP[] }>({
    query: `query($slug: String!, $search: String, $min_price: Float, $max_price: Float, $page: Int, $limit: Int) {
      storefrontProducts(web_store_slug: $slug, search: $search, min_price: $min_price, max_price: $max_price, page: $page, limit: $limit) {
        id price_override image is_active
        master_product { id sku name description price image }
      }
    }`,
    variables: {
      slug: hash,
      search: q || null,
      min_price: min ? Number(min) : null,
      max_price: max ? Number(max) : null,
      page: Number(page),
      limit: 24,
    },
  });
  const products = (data?.storefrontProducts ?? []).filter((p) => p.is_active);

  // If the owner configured dynamic blocks, render those; otherwise fall back
  // to the default template (hero + full product grid).
  if (Array.isArray(blocks) && blocks.length > 0) {
    return (
      <div>
        {await StorefrontPageRenderer({ blocks, hash, products })}
      </div>
    );
  }

  return (
    <div>
      <section
        className="mb-6 rounded-2xl px-6 py-10 text-white"
        style={
          banner
            ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, #111, var(--brand, #111))` }
        }
      >
        <h1 className="text-2xl font-bold sm:text-3xl">Selamat datang</h1>
        <p className="mt-1 text-sm opacity-90">{tagline ?? 'Pilih produk terbaik kami di bawah ini.'}</p>
      </section>

      {/* Price filter */}
      <form
        action={`/storefront/${hash}`}
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4 shadow-sm"
      >
        {q && <input type="hidden" name="q" value={q} />}
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Harga min (Rp)
          <input
            type="number"
            name="min"
            defaultValue={min}
            min={0}
            placeholder="0"
            className="w-32 rounded-lg border bg-neutral-50 px-3 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2"
            style={{ ['--ring' as never]: 'var(--brand)' } as CSSProperties}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Harga maks (Rp)
          <input
            type="number"
            name="max"
            defaultValue={max}
            min={0}
            placeholder="100000"
            className="w-32 rounded-lg border bg-neutral-50 px-3 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2"
            style={{ ['--ring' as never]: 'var(--brand)' } as CSSProperties}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg px-4 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand, #111)' }}
        >
          Terapkan
        </button>
        {(min || max) && (
          <Link
            href={`/storefront/${hash}${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            Reset
          </Link>
        )}
      </form>

      {categories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-500">Kategori</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/storefront/${hash}/categories/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
          Belum ada produk untuk ditampilkan.
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
