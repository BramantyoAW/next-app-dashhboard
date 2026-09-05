'use client';

import { useEffect, useState } from 'react';
import type { Config, DefaultRootProps, RootConfig } from '@puckeditor/core';
import { imageUploadField } from './puckImageField';
import { ProductCard, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import { usePuckDynamic } from '@/lib/puckDynamic';

/**
 * PUCK LAB — prototipe visual editor ala Google Sites / Stitch.
 *
 * Konsep: SELURUH halaman storefront (header, body, footer) dirender sebagai
 * satu kanvas. Tiap bagian adalah komponen yang bisa di-drag/drop, diurutkan,
 * dan propertinya diedit di panel kanan — persis yang kamu minta:
 * "render TEMA per PAGE default (homepage, PDP, dll) untuk bisa di-update
 *  manual seperti Google Stitch pakai CANVAS".
 *
 * Di sini header/footer BUKAN global statis: keduanya komponen biasa di dalam
 * kanvas, sehingga tiap halaman bisa punya header custom berbeda.
 *
 * Route demo: /owner/web-store/puck-lab
 * File: src/lib/puckLabConfig.tsx (client) + halaman editor + halaman render.
 */

type RootProps = DefaultRootProps;

type StoreHeaderProps = {
  logo_mode: 'text' | 'image' | 'both';
  logo_text: string;
  logo_image: string;
  show_search: 'yes' | 'no';
  menu_1: string;
  menu_2: string;
  menu_3: string;
  menu_4: string;
  cta_text: string;
  sticky: 'yes' | 'no';
};
type HeroProps = {
  eyebrow: string;
  heading: string;
  subheading: string;
  cta_text: string;
  image_url: string;
  align: 'left' | 'center';
  dark: 'yes' | 'no';
};
type TextProps = { heading: string; body: string };
type ProductsProps = {
  heading: string;
  mode: 'grid' | 'slider';
  limit: number;
  autoplay: 'yes' | 'no';
};
type ProductSlotProps = {
  /** Teks CTA yang dirender di bawah detail produk (opsional). */
  cta_text: string;
};
type CtaProps = { heading: string; body: string; button_text: string; link: string };
type FaqItem = { q: string; a: string };
type FaqProps = { heading: string; items: FaqItem[] };
type StoreFooterLink = { label: string; href: string };
type StoreFooterProps = {
  about_text: string;
  show_payments: 'yes' | 'no';
  copyright_text: string;
  logo_image: string;
  logo_mode: 'text' | 'image' | 'both';
  show_about: 'yes' | 'no';
  show_links: 'yes' | 'no';
  links_title: string;
  links: StoreFooterLink[];
  show_social: 'yes' | 'no';
  socials_title: string;
  socials: StoreFooterLink[];
};
type ImageProps = {
  image_url: string;
  alt: string;
  caption: string;
  aspect: '16 / 9' | '4 / 3' | '1 / 1' | 'auto';
  fit: 'cover' | 'contain';
  radius: 'none' | 'md' | 'full';
};
type VideoProps = {
  video_url: string;
  caption: string;
  autoplay: 'yes' | 'no';
  loop: 'yes' | 'no';
  mute: 'yes' | 'no';
};
type SlideItem = { image_url: string; caption: string };
type SliderProps = {
  heading: string;
  slides: SlideItem[];
  interval: number;
  autoplay: 'yes' | 'no';
};
type ColumnCell = { title: string; text: string; image_url: string; button_text: string; button_link: string };
type ColumnsProps = {
  layout: '50-50' | '60-40' | '40-60';
  gap: number;
  left: ColumnCell;
  right: ColumnCell;
};

type ComponentProps = {
  StoreHeader: StoreHeaderProps;
  Hero: HeroProps;
  Text: TextProps;
  Products: ProductsProps;
  ProductSlot: ProductSlotProps;
  Cta: CtaProps;
  Faq: FaqProps;
  StoreFooter: StoreFooterProps;
  Image: ImageProps;
  Video: VideoProps;
  Slider: SliderProps;
  Columns: ColumnsProps;
};

/* ---------- Root: kerangka kanvas satu dropzone penuh ---------- */
const Root: RootConfig<{ props: RootProps; fields: Record<string, never> }> = {
  defaultProps: { title: 'Home' },
  render: ({ puck: { renderDropZone: DropZone } }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg, #f4f1ea)',
        color: 'var(--text, #17150f)',
        fontFamily: 'var(--font)',
      }}
    >
      {/* SATU KANVAS: header, body, footer semua di-drag dalam satu urutan vertikal */}
      <DropZone zone="default-zone" style={{ flexGrow: 1 }} />
    </div>
  ),
};

/* ---------- Komponen storefront ---------- */

/** Slider: carousel sederhana (auto-play + tombol panah), tanpa dep eksternal. */
function SliderView({ heading, slides, interval, autoplay }: SliderProps) {
  const [idx, setIdx] = useState(0);
  const list = slides ?? [];
  useEffect(() => {
    if (autoplay !== 'yes' || list.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), Math.max(interval || 4, 1) * 1000);
    return () => clearInterval(id);
  }, [autoplay, list.length, interval]);
  if (list.length === 0) {
    return (
      <div className="px-6 py-6 text-center text-sm opacity-50" style={{ color: 'var(--text, #17150f)' }}>
        Tambahkan slide (gambar) dari panel kanan untuk membuat slider.
      </div>
    );
  }
  const go = (d: number) => setIdx((i) => (i + d + list.length) % list.length);
  return (
    <div className="px-6 py-6" style={{ fontFamily: 'var(--font)' }}>
      {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'var(--text, #17150f)' }}>
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {list.map((s, i) => (
            <div key={i} className="relative w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image_url} alt={s.caption || ''} className="h-72 w-full object-cover sm:h-96" />
              {s.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-semibold text-white">
                  {s.caption}
                </div>
              )}
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Sebelumnya" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Berikutnya" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60">›</button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {list.map((_, i) => (
                <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Columns: susun 2 sel (gambar kiri + teks kanan dst) ala section split. */
function ColumnsView({ layout, gap, left, right }: ColumnsProps) {
  const col = (cell: ColumnCell, dark?: boolean) => (
    <div className="flex flex-col items-start" style={{ color: 'var(--text, #17150f)' }}>
      {cell.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cell.image_url} alt={cell.title || ''} className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />
      )}
      {cell.title && <h3 className="text-lg font-medium">{cell.title}</h3>}
      {cell.text && <p className="mt-1 text-sm opacity-70">{cell.text}</p>}
      {cell.button_text && (
        <a href={cell.button_link || '#'} className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold" style={{ background: 'var(--brand, #8a6f4d)', color: dark ? '#111' : '#fff' }}>
          {cell.button_text}
        </a>
      )}
    </div>
  );
  const grid = layout === '60-40' ? 'lg:grid-cols-[3fr_2fr]' : layout === '40-60' ? 'lg:grid-cols-[2fr_3fr]' : 'lg:grid-cols-2';
  return (
    <div className="px-6 py-6" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>
      <div className={`grid items-start gap-4 ${grid}`} style={{ gap }}>
        <div>{col(left)}</div>
        <div>{col(right)}</div>
      </div>
    </div>
  );
}

/** Produk unggulan — menampilkan produk ASLI dari katalog store.
 * Saat dirender di storefront, fetch produk via `storefrontProducts` dan
 * render kartu asli (link PDP benar + Add to Cart). Di editor (preview)
 * tidak ada konteks storefront → tampilkan placeholder.
 */
function ProductsView({ heading, mode, limit }: ProductsProps) {
  const total = Math.min(limit || 4, 8);
  const perView = 4;
  const [idx, setIdx] = useState(0);
  const [hash, setHash] = useState('');
  const [items, setItems] = useState<StorefrontProduct[]>([]);
  const [state, setState] = useState<'loading' | 'done'>('loading');

  useEffect(() => {
    // Hash storefront: dari path /storefront/<hash> ATAU subdomain host
    // (dev *.lvh.me, prod *.<domain>).
    const fromPath = window.location.pathname.match(/\/storefront\/([^/]+)/)?.[1];
    const host = window.location.hostname;
    const fromHost = host.includes('.') && !/^localhost$|^\d/.test(host)
      ? host.split('.')[0]
      : '';
    const h = fromPath || fromHost || '';
    setHash(h);
    if (!h) {
      // Editor / preview — tidak ada katalog storefront, diam.
      setState('done');
      return;
    }
    let on = true;
    (async () => {
      try {
        const { gqlFetch } = await import('@/lib/graphqlClient');
        const res = await gqlFetch<{ storefrontProducts: StorefrontProduct[] | null }>(
          `query($slug: String!, $limit: Int) {
            storefrontProducts(web_store_slug: $slug, limit: $limit) {
              id price_override image is_active
              master_product { id sku name price image }
            }
          }`,
          { slug: h, limit: total }
        );
        if (on) {
          setItems((res?.storefrontProducts ?? []).filter((p) => p.is_active !== false));
          setState('done');
        }
      } catch {
        if (on) setState('done');
      }
    })();
    return () => {
      on = false;
    };
  }, [total]);

  const card = (i: number) => (
    <div key={i} className="overflow-hidden rounded-xl border border-black/10">
      <div className="aspect-square bg-black/5" />
      <div className="p-2 text-xs font-semibold" style={{ color: 'var(--text, #17150f)' }}>Produk {i + 1}</div>
      <div className="px-2 pb-2 text-xs font-bold" style={{ color: 'var(--brand, #8a6f4d)' }}>Rp 25.000</div>
    </div>
  );

  const body = (shown: number) =>
    Array.from({ length: shown }).map((_, i) => (hash && items[i] ? (
      <ProductCard key={items[i].id} hash={hash} p={items[i]} />
    ) : (
      card(i)
    )));

  const show = items.length > 0 ? Math.min(items.length, total) : (state === 'loading' && hash ? 0 : total);
  const auto = mode === 'slider' && items.length > perView;

  if (mode === 'slider' && show > perView) {
    const maxIdx = Math.max(show - perView, 0);
    const i0 = Math.min(idx, maxIdx);
    return (
      <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
        {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.min(perView, show) }).map((_, j) => {
              const k = items.length > 0 ? i0 + j : j;
              return (items.length > 0 && items[k] && hash) ? (
                <ProductCard key={items[k].id} hash={hash} p={items[k]} />
              ) : card(k);
            })}
          </div>
          {maxIdx > 0 && (
            <>
              <button type="button" onClick={() => setIdx((i) => Math.max(i - 1, 0))} aria-label="Mundur" className="absolute -left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50">‹</button>
              <button type="button" onClick={() => setIdx((i) => Math.min(i + 1, maxIdx))} aria-label="Maju" className="absolute -right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50">›</button>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
      {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {body(show > 0 ? show : total)}
      </div>
    </div>
  );
}

/**
 * SLOT PRODUK DINAMIS — inti "kanvas + data aktif" utk PDP (dan bisa dipakai
 * di halaman lain). Dirender di dalam kanvas Puck TAPI menampilkan produk
 * AKTIF yang dibuka (dari konteks dinamis), bukan data statis blok.
 */
function ProductSlotView({ cta_text }: ProductSlotProps) {
  const { hash, product, storeName } = usePuckDynamic();
  const btn = cta_text || 'Beli Sekarang';

  if (!product) {
    return (
      <div className="px-6 py-16 text-center text-sm" style={{ color: 'var(--text, #17150f)' }}>
        {product === undefined ? 'Memuat produk...' : 'Produk tidak ditemukan.'}
      </div>
    );
  }
  const mp = product.master_product ?? product;
  const name = mp?.name ?? (product as any).name ?? 'Produk';
  const price = Number(product.price ?? mp?.price ?? 0);
  const url = mp?.image || product?.image || '';
  const wa = `https://wa.me/?text=${encodeURIComponent(`Halo ${storeName ? 'kak ' + storeName : ''}, saya mau pesan: ${name} (${hash ? '' : ''})`)}`;

  return (
    <div className="px-6 py-6" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/5">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand, #8a6f4d)' }}>
            {product.sku || mp?.sku || 'PRODUK'}
          </span>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{name}</h1>
          <p className="mt-2 text-lg font-bold" style={{ color: 'var(--brand, #8a6f4d)' }}>
            {Number.isFinite(price) && price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : 'Hubungi kami'}
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted, #7a7568)' }}>
            {product.description || mp?.description || ''}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full px-6 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand, #8a6f4d)', color: '#fff' }}
            >
              {btn}
            </button>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-6 py-2.5 text-sm font-bold"
              style={{ borderColor: 'var(--brand, #8a6f4d)', color: 'var(--brand, #8a6f4d)' }}
            >
              Order via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const puckLabConfig: Config<ComponentProps> = {
  root: Root,
  components: {
    StoreHeader: {
      label: 'Header Toko (custom)',
      fields: {
        logo_mode: {
          type: 'radio',
          label: 'Tampilan Logo',
          options: [
            { label: 'Gambar logo', value: 'image' },
            { label: 'Nama toko', value: 'text' },
            { label: 'Gambar + nama', value: 'both' },
          ],
        },
        logo_image: imageUploadField(),
        logo_text: { type: 'text', label: 'Nama Toko' },
        show_search: {
          type: 'radio',
          label: 'Kolom Pencarian',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        menu_1: { type: 'text', label: 'Menu 1' },
        menu_2: { type: 'text', label: 'Menu 2' },
        menu_3: { type: 'text', label: 'Menu 3 (opsional)' },
        menu_4: { type: 'text', label: 'Menu 4 (opsional)' },
        cta_text: { type: 'text', label: 'Tombol CTA' },
        sticky: {
          type: 'radio',
          label: 'Sticky',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
      },
      defaultProps: { logo_mode: 'both', logo_text: 'TOKO SAYA', logo_image: '', show_search: 'yes', menu_1: 'Tentang', menu_2: 'Cara Order', menu_3: '', menu_4: '', cta_text: 'Pesan', sticky: 'yes' },
      render: ({ logo_mode, logo_text, logo_image, show_search, menu_1, menu_2, menu_3, menu_4, cta_text, sticky }) => {
        // Data lama tanpa logo_mode → perlakukan sebagai mode nama (text).
        const lm: 'text' | 'image' | 'both' = logo_mode || 'text';
        const menus = [menu_1, menu_2, menu_3, menu_4].filter(Boolean);
        return (
          <div
            className="flex items-center justify-between gap-3 px-6 py-3"
            style={{
              background: 'var(--text, #17150f)',
              color: 'var(--bg, #f4f1ea)',
              fontFamily: 'var(--font)',
              position: sticky === 'yes' ? 'sticky' : 'static',
              top: 0,
              zIndex: 30,
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              {(lm === 'image' || lm === 'both') && logo_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo_image} alt={logo_text || 'logo'} className="max-h-9 w-auto rounded object-contain" />
              )}
              {(lm === 'text' || lm === 'both') && logo_text && (
                <div className="truncate font-bold tracking-wide" style={{ color: lm === 'text' ? 'var(--brand, #d6ff3f)' : 'var(--bg, #f4f1ea)' }}>
                  {logo_text}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {menus.map((m, i) => (
                <span key={i} className="whitespace-nowrap opacity-80 hover:opacity-100">{m}</span>
              ))}
              {show_search === 'yes' && <span className="hidden rounded-full border border-white/30 px-3 py-0.5 text-xs opacity-70 md:inline">🔍 Cari...</span>}
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--brand, #d6ff3f)', color: 'var(--text, #17150f)' }}>
                {cta_text}
              </span>
            </div>
          </div>
        );
      },
    },

    Hero: {
      label: 'Hero / Banner',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Judul' },
        subheading: { type: 'textarea', label: 'Subjudul' },
        cta_text: { type: 'text', label: 'Teks Tombol' },
        image_url: imageUploadField(),
        align: {
          type: 'radio',
          label: 'Tata Letak',
          options: [
            { label: 'Split (kiri teks)', value: 'left' },
            { label: 'Tengah (latar)', value: 'center' },
          ],
        },
        dark: {
          type: 'radio',
          label: 'Latar',
          options: [
            { label: 'Gelap (auto)', value: 'yes' },
            { label: 'Terang', value: 'no' },
          ],
        },
      },
      defaultProps: { eyebrow: 'TERBARU', heading: 'Judul Hero Anda', subheading: 'Subjudul singkat yang menjelaskan nilai toko Anda.', cta_text: 'Belanja Sekarang', image_url: '', align: 'left', dark: 'yes' },
      render: ({ eyebrow, heading, subheading, cta_text, image_url, align, dark }) => {
        const isDark = dark === 'yes';
        const isCenter = align === 'center';
        if (!isCenter && image_url) {
          return (
            <div className="grid items-center gap-6 px-6 py-10 lg:grid-cols-2" style={{ background: 'var(--bg, #f4f1ea)', color: 'var(--text, #17150f)' }}>
              <div>
                {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--brand, #8a6f4d)' }}>{eyebrow}</div>}
                {heading && <h1 className="text-4xl font-medium leading-tight">{heading}</h1>}
                {subheading && <p className="mt-2 max-w-md text-sm opacity-70">{subheading}</p>}
                {cta_text && <div className="mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold" style={{ background: 'var(--brand, #8a6f4d)', color: 'var(--brand-contrast, #fff)' }}>{cta_text}</div>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image_url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            </div>
          );
        }
        const bg = image_url
          ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : isDark
            ? { background: 'linear-gradient(135deg, var(--text, #17150f), #2a2420)' }
            : { background: 'var(--bg, #f4f1ea)' };
        return (
          <div className="px-6 py-16 text-center" style={{ ...bg, color: isDark || image_url ? '#fff' : 'var(--text, #17150f)' }}>
            {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">{eyebrow}</div>}
            {heading && <h1 className="mx-auto max-w-2xl text-4xl font-medium leading-tight sm:text-5xl">{heading}</h1>}
            {subheading && <p className="mx-auto mt-3 max-w-xl text-sm opacity-80">{subheading}</p>}
            {cta_text && (
              <span className="mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: 'var(--brand, #d6ff3f)', color: 'var(--text, #17150f)' }}>
                {cta_text}
              </span>
            )}
          </div>
        );
      },
    },

    Text: {
      label: 'Teks / Paragraf',
      fields: {
        heading: { type: 'text', label: 'Judul' },
        body: { type: 'textarea', label: 'Isi' },
      },
      defaultProps: { heading: 'Tentang Kami', body: 'Tulis paragraf di sini. Kamu bisa mengubah teks langsung dari panel kanan.' },
      render: ({ heading, body }) => (
        <div className="px-6 py-4" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>
          {heading && <h2 className="text-xl font-medium">{heading}</h2>}
          {body && <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm" style={{ color: 'var(--muted, #7a7568)' }}>{body}</p>}
        </div>
      ),
    },

    Products: {
      label: 'Produk Unggulan',
      fields: {
        heading: { type: 'text', label: 'Judul Section' },
        mode: {
          type: 'radio',
          label: 'Mode Tampil',
          options: [
            { label: 'Grid (kisi)', value: 'grid' },
            { label: 'Slider (geser)', value: 'slider' },
          ],
        },
        limit: { type: 'number', label: 'Jumlah Produk', min: 1, max: 12 },
        autoplay: {
          type: 'radio',
          label: 'Slider Putar Otomatis',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
      },
      defaultProps: { heading: 'Menu Favorit', mode: 'grid', limit: 4, autoplay: 'yes' },
      render: ProductsView,
    },

    ProductSlot: {
      label: 'Slot Produk (PDP)',
      fields: {
        cta_text: { type: 'text', label: 'Teks Tombol Beli' },
      },
      defaultProps: { cta_text: 'Beli Sekarang' },
      render: ProductSlotView,
    },

    Cta: {
      label: 'Ajakan (CTA)',
      fields: {
        heading: { type: 'text', label: 'Judul' },
        body: { type: 'textarea', label: 'Isi' },
        button_text: { type: 'text', label: 'Teks Tombol' },
        link: { type: 'text', label: 'Link (wa.me / #)' },
      },
      defaultProps: { heading: 'Pesan Sekarang!', body: 'Jangan lewatkan promo minggu ini.', button_text: 'Chat WhatsApp', link: '#' },
      render: ({ heading, body, button_text }) => (
        <div className="px-6 py-10 text-center" style={{ background: 'var(--text, #17150f)', color: 'var(--bg, #f4f1ea)' }}>
          {heading && <h2 className="text-2xl font-medium">{heading}</h2>}
          {body && <p className="mx-auto mt-2 max-w-md text-sm opacity-70">{body}</p>}
          {button_text && (
            <span className="mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: 'var(--brand, #d6ff3f)', color: 'var(--text, #17150f)' }}>
              {button_text}
            </span>
          )}
        </div>
      ),
    },

    Faq: {
      label: 'FAQ',
      fields: {
        heading: { type: 'text', label: 'Judul' },
        items: {
          type: 'array',
          label: 'Pertanyaan',
          getItemSummary: (item) => (item as FaqItem)?.q || 'Pertanyaan',
          arrayFields: {
            q: { type: 'text', label: 'Pertanyaan' },
            a: { type: 'textarea', label: 'Jawaban' },
          },
        },
      },
      defaultProps: {
        heading: 'Pertanyaan Umum',
        items: [
          { q: 'Berapa lama pengiriman?', a: '1-3 hari kerja.' },
          { q: 'Bisa COD?', a: 'Ya, untuk area tertentu.' },
        ],
      },
      render: ({ heading, items }) => (
        <div className="px-6 py-4" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>
          {heading && <h2 className="mb-3 text-xl font-medium">{heading}</h2>}
          {(items ?? []).map((it, i) => (
            <div key={i} className="border-b border-black/10 py-2">
              <div className="text-sm font-semibold">{it.q}</div>
              <div className="text-xs opacity-60">{it.a}</div>
            </div>
          ))}
        </div>
      ),
    },

    Image: {
      label: 'Gambar',
      fields: {
        image_url: imageUploadField(),
        alt: { type: 'text', label: 'Teks Alt' },
        caption: { type: 'text', label: 'Keterangan' },
        aspect: {
          type: 'radio',
          label: 'Rasio',
          options: [
            { label: 'Landscape 16:9', value: '16 / 9' },
            { label: 'Foto 4:3', value: '4 / 3' },
            { label: 'Kotak 1:1', value: '1 / 1' },
            { label: 'Otomatis', value: 'auto' },
          ],
        },
        fit: {
          type: 'radio',
          label: 'Mode',
          options: [
            { label: 'Potong (cover)', value: 'cover' },
            { label: 'Muati (contain)', value: 'contain' },
          ],
        },
        radius: {
          type: 'radio',
          label: 'Sudut',
          options: [
            { label: 'Tajam', value: 'none' },
            { label: 'Sedang', value: 'md' },
            { label: 'Bulat penuh', value: 'full' },
          ],
        },
      },
      defaultProps: { image_url: 'https://picsum.photos/seed/ombot/1200/675', alt: '', caption: '', aspect: '16 / 9', fit: 'cover', radius: 'md' },
      render: ({ image_url, alt, caption, aspect, fit, radius }) => {
        if (!image_url) {
          return (
            <div className="px-6 py-10 text-center text-sm opacity-40" style={{ color: 'var(--text, #17150f)' }}>
              Isi URL gambar pada panel kanan untuk menampilkan gambar.
            </div>
          );
        }
        // class statis (Tailwind JIT tidak bisa membuat class dinamis)
        const aspectCls = aspect === '16 / 9' ? 'aspect-[16/9]' : aspect === '4 / 3' ? 'aspect-[4/3]' : aspect === '1 / 1' ? 'aspect-square' : '';
        const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover';
        const radiusCls = radius === 'full' ? 'rounded-full' : radius === 'md' ? 'rounded-xl' : '';
        return (
          <figure className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image_url} alt={alt || ''} className={`w-full ${aspectCls} ${fitCls} ${radiusCls}`} />
            {caption && <figcaption className="mt-1 text-center text-xs opacity-50" style={{ color: 'var(--text, #17150f)' }}>{caption}</figcaption>}
          </figure>
        );
      },
    },

    Video: {
      label: 'Video',
      fields: {
        video_url: { type: 'text', label: 'URL (YouTube / MP4)' },
        caption: { type: 'text', label: 'Keterangan' },
        autoplay: {
          type: 'radio',
          label: 'Putar Otomatis',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        loop: {
          type: 'radio',
          label: 'Ulang',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        mute: {
          type: 'radio',
          label: 'Bisukan',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
      },
      defaultProps: { video_url: '', caption: '', autoplay: 'no', loop: 'no', mute: 'no' },
      render: ({ video_url, caption, autoplay, loop, mute }) => {
        if (!video_url) {
          return (
            <div className="px-6 py-10 text-center text-sm opacity-40" style={{ color: 'var(--text, #17150f)' }}>
              Tempel URL video (YouTube / file MP4) pada panel kanan.
            </div>
          );
        }
        // YouTube embed → format iframe; selain itu <video>.
        const yt = video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
        return (
          <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
            <div className="overflow-hidden rounded-xl bg-black/90">
              {yt ? (
                <iframe
                  src={`https://www.youtube.com/embed/${yt[1]}${autoplay === 'yes' ? '?autoplay=1' : ''}`}
                  title={caption || 'Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <video
                  src={video_url}
                  controls
                  autoPlay={autoplay === 'yes'}
                  loop={loop === 'yes'}
                  muted={mute === 'yes'}
                  className="aspect-video w-full"
                />
              )}
            </div>
            {caption && <div className="mt-1 text-center text-xs opacity-50" style={{ color: 'var(--text, #17150f)' }}>{caption}</div>}
          </div>
        );
      },
    },

    Slider: {
      label: 'Slider / Korsel',
      fields: {
        heading: { type: 'text', label: 'Judul' },
        slides: {
          type: 'array',
          label: 'Slide Gambar',
          getItemSummary: (item) => (item as SlideItem)?.caption || (item as SlideItem)?.image_url?.slice(0, 40) || 'Slide',
          arrayFields: {
            image_url: imageUploadField(),
            caption: { type: 'text', label: 'Keterangan' },
          },
        },
        autoplay: {
          type: 'radio',
          label: 'Putar Otomatis',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        interval: { type: 'number', label: 'Detik per Slide', min: 1, max: 15 },
      },
      defaultProps: {
        heading: 'Galeri',
        autoplay: 'yes',
        interval: 4,
        slides: [
          { image_url: 'https://picsum.photos/seed/ombot1/1200/675', caption: 'Slide 1' },
          { image_url: 'https://picsum.photos/seed/ombot2/1200/675', caption: 'Slide 2' },
        ],
      },
      render: SliderView,
    },

    Columns: {
      label: 'Kolom (Gambar + Teks)',
      fields: {
        layout: {
          type: 'radio',
          label: 'Lebar Kolom',
          options: [
            { label: '50 / 50', value: '50-50' },
            { label: '60 / 40', value: '60-40' },
            { label: '40 / 60', value: '40-60' },
          ],
        },
        gap: { type: 'number', label: 'Jarak (px)', min: 0, max: 48 },
        left: {
          type: 'object',
          label: 'Kolom Kiri',
          objectFields: {
            image_url: imageUploadField(),
            title: { type: 'text', label: 'Judul' },
            text: { type: 'textarea', label: 'Teks' },
            button_text: { type: 'text', label: 'Teks Tombol (kosongkan utk tanpa)' },
            button_link: { type: 'text', label: 'Link Tombol' },
          },
        },
        right: {
          type: 'object',
          label: 'Kolom Kanan',
          objectFields: {
            image_url: imageUploadField(),
            title: { type: 'text', label: 'Judul' },
            text: { type: 'textarea', label: 'Teks' },
            button_text: { type: 'text', label: 'Teks Tombol (kosongkan utk tanpa)' },
            button_link: { type: 'text', label: 'Link Tombol' },
          },
        },
      },
      defaultProps: {
        layout: '50-50',
        gap: 16,
        left: { image_url: 'https://picsum.photos/seed/ombotL/800/600', title: 'Kiri', text: 'Ganti dengan foto produk atau cerita toko Anda.', button_text: '', button_link: '#' },
        right: { image_url: '', title: 'Kanan', text: 'Tulis penjelasan di sini. Susunan 2 kolom ini bisa dipakai untuk "foto di kiri, tulisan di kanan".', button_text: '', button_link: '#' },
      },
      render: ColumnsView,
    },

    StoreFooter: {
      label: 'Footer Toko',
      fields: {
        logo_mode: {
          type: 'radio',
          label: 'Logo Footer',
          options: [
            { label: 'Tanpa logo', value: 'text' },
            { label: 'Gambar logo', value: 'image' },
            { label: 'Gambar + nama', value: 'both' },
          ],
        },
        logo_image: imageUploadField(),
        about_text: { type: 'textarea', label: 'Teks Tentang Toko' },
        show_about: {
          type: 'radio',
          label: 'Tampilkan Tentang',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        show_links: {
          type: 'radio',
          label: 'Tampilkan Menu Link',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        links_title: { type: 'text', label: 'Judul Menu Link' },
        links: {
          type: 'array',
          label: 'Link',
          getItemSummary: (item) => (item as StoreFooterLink)?.label || 'Link',
          arrayFields: {
            label: { type: 'text', label: 'Teks' },
            href: { type: 'text', label: 'Tujuan (mis. /about)' },
          },
        },
        show_social: {
          type: 'radio',
          label: 'Tampilkan Sosial Media',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        socials_title: { type: 'text', label: 'Judul Sosial' },
        socials: {
          type: 'array',
          label: 'Sosial Media',
          getItemSummary: (item) => (item as StoreFooterLink)?.label || 'Sosial',
          arrayFields: {
            label: { type: 'text', label: 'Nama (IG / FB / WA)' },
            href: { type: 'text', label: 'Link' },
          },
        },
        show_payments: {
          type: 'radio',
          label: 'Badge Pembayaran',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
        copyright_text: { type: 'text', label: 'Teks Hak Cipta' },
      },
      defaultProps: {
        logo_mode: 'text',
        logo_image: '',
        about_text: 'Toko online terpercaya untuk kebutuhan harian Anda.',
        show_about: 'yes',
        show_links: 'yes',
        links_title: 'Menu',
        links: [
          { label: 'Tentang', href: '/about' },
          { label: 'Cara Order', href: '/cara-order' },
        ],
        show_social: 'yes',
        socials_title: 'Ikuti Kami',
        socials: [
          { label: 'Instagram', href: '#' },
          { label: 'WhatsApp', href: '#' },
        ],
        show_payments: 'yes',
        copyright_text: '© 2026 Toko Saya. Hak cipta dilindungi.',
      },
      render: ({ logo_mode, logo_image, about_text, show_about, show_links, links_title, links, show_social, socials_title, socials, show_payments, copyright_text }) => {
        // Data lama tanpa field toggle → default tampil (kecuali 'no').
        const lm = logo_mode || 'text';
        const aboutOn = show_about !== 'no';
        const linksOn = show_links !== 'no';
        const socialOn = show_social !== 'no';
        const payOn = show_payments !== 'no';
        const linkList = links ?? [];
        const socialList = socials ?? [];
        return (
          <div className="px-6 py-8" style={{ background: 'var(--text, #17150f)', color: 'var(--bg, #f4f1ea)' }}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Kolom brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2">
                  {(lm === 'image' || lm === 'both') && logo_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo_image} alt="logo" className="max-h-8 w-auto rounded object-contain" />
                  )}
                </div>
                {aboutOn && about_text && <p className="mt-2 max-w-xs text-xs opacity-70">{about_text}</p>}
              </div>
              {/* Kolom menu */}
              {linksOn && (
                <div>
                  {links_title && <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">{links_title}</div>}
                  <ul className="space-y-1.5 text-xs opacity-80">
                    {linkList.map((l, i) => (
                      <li key={i}><a href={l.href || '#'} className="hover:opacity-100">{l.label}</a></li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Kolom sosial */}
              {socialOn && (
                <div>
                  {socials_title && <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">{socials_title}</div>}
                  <ul className="space-y-1.5 text-xs opacity-80">
                    {socialList.map((s, i) => (
                      <li key={i}><a href={s.href || '#'} className="hover:opacity-100">{s.label}</a></li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Pembayaran */}
              {payOn && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Pembayaran</div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    {['BCA', 'OVO', 'GOPAY', 'QRIS'].map((p) => (
                      <span key={p} className="rounded border border-white/30 px-1.5 py-0.5 opacity-80">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {copyright_text && <div className="mt-6 border-t border-white/10 pt-3 text-[10px] opacity-50">{copyright_text}</div>}
          </div>
        );
      },
    },
  },
};

export default puckLabConfig;
