import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { ProductGrid } from '@/components/storefront/ui/ProductCard';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

type Category = { id: string; name: string; slug: string | null };

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
      store_name: string;
      tagline: string | null;
      banner_url: string | null;
      pages: { slug: string; blocks: unknown[] | null }[] | null;
    } | null;
  }>({
    query: `query($hash: String!) {
      webStoreByHash(hash: $hash) {
        store_name tagline banner_url
        pages { slug blocks }
      }
    }`,
    variables: { hash },
  });
  const ws = wsData?.webStoreByHash;
  const banner = ws?.banner_url ?? null;
  const tagline = ws?.tagline ?? null;
  const storeName = ws?.store_name ?? 'Toko';
  const homePage = ws?.pages?.find((p) => p.slug === 'home');
  const blocks = (homePage?.blocks ?? null) as { type: string; [key: string]: unknown }[] | null;

  // Kategori storefront (anon) untuk chip/filter navigasi.
  const catData = await gqlFetchServer<{ storefrontCategories: Category[] | null }>({
    query: `query($web_store_slug: String!) {
      storefrontCategories(web_store_slug: $web_store_slug) { id name slug }
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

  // Jika owner mengkonfigurasi blok halaman (page builder), render itu;
  // sebaliknya fallback ke template default (hero + katalog).
  if (Array.isArray(blocks) && blocks.length > 0) {
    return (
      <div className="space-y-10">
        {await StorefrontPageRenderer({ blocks, hash, products })}
        {categories.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              <Link
                href={`/storefront/${hash}${q ? `?q=${encodeURIComponent(q)}` : ''}`}
                className="shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                style={{ background: 'var(--brand, #111)' }}
              >
                Semua
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/storefront/${hash}/categories/${c.slug}`}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}
        {products.length > 0 && (
          <section>
            <ProductGrid hash={hash} products={products} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl px-6 py-14 text-white sm:px-10 sm:py-20"
        style={
          banner
            ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, var(--brand, #111) 0%, #0f172a 100%)` }
        }
      >
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            {storeName}
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {tagline ? tagline.split('—')[0].trim() : 'Selamat Datang'}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {tagline ?? 'Pilih produk terbaik kami di bawah ini.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#products"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              Lihat Katalog
            </Link>
            <Link
              href={`/storefront/${hash}/cart`}
              className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Keranjang Saya
            </Link>
          </div>
        </div>
      </section>

      {/* Kategori */}
      {categories.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
            <Link
              href={`/storefront/${hash}${q ? `?q=${encodeURIComponent(q)}` : ''}`}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
              style={{ background: 'var(--brand, #111)' }}
            >
              Semua
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/storefront/${hash}/categories/${c.slug}`}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filter harga */}
      <form
        action={`/storefront/${hash}`}
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {q && <input type="hidden" name="q" value={q} />}
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Harga min (Rp)
          <input
            type="number"
            name="min"
            defaultValue={min}
            min={0}
            placeholder="0"
            className="w-32 rounded-lg border border-slate-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:bg-white focus:ring-2"
            style={{ ['--tw-ring-color' as never]: 'var(--brand)' } as React.CSSProperties}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Harga maks (Rp)
          <input
            type="number"
            name="max"
            defaultValue={max}
            min={0}
            placeholder="100000"
            className="w-32 rounded-lg border border-slate-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:bg-white focus:ring-2"
            style={{ ['--tw-ring-color' as never]: 'var(--brand)' } as React.CSSProperties}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg px-5 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
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
        {q && (
          <span className="ml-auto text-xs text-slate-400">
            Hasil untuk “<b className="text-slate-600">{q}</b>” · {products.length} produk
          </span>
        )}
      </form>

      {/* Produk */}
      <section id="products" className="scroll-mt-24">
        <ProductGrid hash={hash} products={products} />
      </section>
    </div>
  );
}
