import Link from 'next/link';
import { gqlFetchServer } from '@/lib/gql-server';
import { ProductGrid } from '@/components/storefront/ui/ProductCard';
import { StorefrontPageRenderer } from '@/components/storefront/StorefrontPageRenderer';
import StorefrontPuckRenderer from '@/components/storefront/StorefrontPuckRenderer';
import StorefrontShopShell from '@/components/storefront/StorefrontShopShell';
import { isPuckStored, puckDataOf } from '@/lib/puckAdapter';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  /** false = habis (dihitung backend lintas outlet & tabel stok varian). */
  is_in_stock: boolean | null;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

type Category = { id: string; name: string; slug: string | null };

/**
 * Halaman DEPAN (home) storefront — route root /storefront/<hash>, di bawah
 * layout [hash]/layout.tsx yang hanya menyuntik tema (tanpa chrome toko).
 *
 * Dua mode:
 *  1. Home dibuat dengan page builder (data Puck di web_pages.blocks):
 *     dirender full-canvas — chrome (header/footer/feature) juga dikelola
 *     owner via blok di kanvas → tidak dibungkus shell (Shopify-like).
 *  2. Home belum di-builder: dibungkus chrome toko (StorefrontShopShell).
 */
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
      pages: { slug: string; blocks: unknown }[] | null;
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
  if (!ws) return null;
  const banner = ws.banner_url ?? null;
  const tagline = ws.tagline ?? null;
  const storeName = ws.store_name || 'Toko';
  const homePage = ws.pages?.find((p) => p.slug === 'home');
  const homeBlocks = homePage?.blocks ?? null;

  // Hasil pencarian HARUS menggantikan halaman depan, bukan disisipkan di
  // bawahnya. Sebelumnya blok produk berada setelah hero + section promosi,
  // sehingga kartu hasil pertama muncul di Y≈1050px — di bawah lipatan layar
  // untuk desktop (900px) maupun HP (844px). Pembeli menekan cari, tidak
  // melihat perubahan apa pun, dan menyimpulkan pencariannya rusak.
  if (q.trim() !== '') {
    return (
      <StorefrontShopShell hash={hash}>
        <SearchResultView hash={hash} q={q} min={min} max={max} page={page} />
      </StorefrontShopShell>
    );
  }

  // Mode 1: home full-canvas dari page builder (data Puck).
  if (homeBlocks && isPuckStored(homeBlocks)) {
    const puck = puckDataOf(homeBlocks);
    if (puck) {
      return <StorefrontPuckRenderer data={puck} storeName={storeName} dynamic={{ hash }} />;
    }
  }
  const blocks = (Array.isArray(homeBlocks) ? homeBlocks : null) as { type: string; [key: string]: unknown }[] | null;

  return (
    <StorefrontShopShell hash={hash}>
      <HomeContent hash={hash} blocks={blocks} banner={banner} tagline={tagline} storeName={storeName} q={q} min={min} max={max} page={page} />
    </StorefrontShopShell>
  );
}

async function HomeContent({
  hash,
  blocks,
  banner,
  tagline,
  storeName,
  q,
  min,
  max,
}: {
  hash: string;
  blocks: { type: string; [key: string]: unknown }[] | null;
  banner: string | null;
  tagline: string | null;
  storeName: string;
  q: string;
  min: string;
  max: string;
  page: string;
}) {
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
        id price_override image is_active is_in_stock
        master_product { id sku name description price image }
      }
    }`,
    variables: {
      slug: hash,
      search: q || null,
      min_price: min ? Number(min) : null,
      max_price: max ? Number(max) : null,
      page: 1,
      limit: 24,
    },
  });
  const products = (data?.storefrontProducts ?? []).filter((p) => p.is_active);

  // Blok ombot lama → render + kategori/produk di bawahnya.
  if (blocks && blocks.length > 0) {
    return (
      <div className="space-y-10">
        {await StorefrontPageRenderer({ blocks, hash, products, bannerUrl: banner })}
        <CategoryChips hash={hash} categories={categories} q={q} active={true} />
        {products.length > 0 && (
          <section>
            <ProductGrid hash={hash} products={products} />
          </section>
        )}
      </div>
    );
  }

  // Fallback template default (hero + katalog).
  return (
    <div className="space-y-8">
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

      <CategoryChips hash={hash} categories={categories} q={q} active={false} />

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

      <section id="products" className="scroll-mt-24">
        <ProductGrid hash={hash} products={products} />
      </section>
    </div>
  );
}

function CategoryChips({
  hash,
  categories,
  q,
  active,
}: {
  hash: string;
  categories: Category[];
  q: string;
  active: boolean;
}) {
  if (categories.length === 0) return null;
  void active;
  return (
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
  );
}

/**
 * Halaman hasil pencarian.
 *
 * Ditampilkan sebagai pengganti halaman depan saat pembeli menekan cari —
 * bukan disisipkan di bawah hero. Alasan: pada halaman depan normal, kartu
 * produk pertama berada di Y≈1050px, di bawah lipatan layar desktop (900px)
 * maupun HP (844px). Akibatnya pembeli melihat "tidak terjadi apa-apa" dan
 * menyimpulkan pencariannya rusak, padahal hasilnya ada.
 *
 * Selalu memberi umpan balik: jumlah hasil bila ketemu, atau penjelasan dan
 * jalan keluar bila tidak — supaya "nol hasil" tidak terasa seperti error.
 */
async function SearchResultView({
  hash,
  q,
  min,
  max,
  page,
}: {
  hash: string;
  q: string;
  min: string;
  max: string;
  page: string;
}) {
  const data = await gqlFetchServer<{ storefrontProducts: SP[] }>({
    query: `query($slug: String!, $search: String, $min_price: Float, $max_price: Float, $page: Int, $limit: Int) {
      storefrontProducts(web_store_slug: $slug, search: $search, min_price: $min_price, max_price: $max_price, page: $page, limit: $limit) {
        id price_override image is_active is_in_stock
        master_product { id sku name description price image }
      }
    }`,
    variables: {
      slug: hash,
      search: q,
      min_price: min ? Number(min) : null,
      max_price: max ? Number(max) : null,
      page: Number(page) || 1,
      limit: 24,
    },
  });
  const products = (data?.storefrontProducts ?? []).filter((p) => p.is_active);

  return (
    <section className="space-y-6">
      <nav className="text-xs" style={{ color: 'var(--muted, #6f6a63)' }}>
        <Link href={`/storefront/${hash}`} className="transition-colors hover:underline">
          Beranda
        </Link>
        <span className="mx-1.5">/</span>
        <span>Hasil pencarian</span>
      </nav>

      <header>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: 'var(--muted, #6f6a63)' }}
        >
          Hasil pencarian
        </p>
        <h1
          className="mt-1 text-2xl font-medium sm:text-3xl"
          style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--text, #161616)' }}
        >
          “{q}”
        </h1>
        {/* Jumlah hasil selalu disebut. Tanpa ini, "nol hasil" tidak bisa
            dibedakan dari "halaman gagal memuat". */}
        <p className="mt-2 text-sm" style={{ color: 'var(--muted, #6f6a63)' }}>
          {products.length > 0
            ? `${products.length} produk ditemukan`
            : 'Tidak ada produk yang cocok'}
        </p>
      </header>

      {products.length > 0 ? (
        <ProductGrid hash={hash} products={products} />
      ) : (
        <div className="border border-current/10 px-6 py-16 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text, #161616)' }}>
            Tidak ada produk yang cocok dengan “{q}”
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed" style={{ color: 'var(--muted, #6f6a63)' }}>
            Coba kata kunci lain, periksa ejaannya, atau gunakan kata yang lebih umum.
          </p>
          <Link
            href={`/storefront/${hash}`}
            className="mt-5 inline-block px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand, #161616)', color: 'var(--brand-contrast, #faf9f6)' }}
          >
            Lihat Semua Produk
          </Link>
        </div>
      )}
    </section>
  );
}