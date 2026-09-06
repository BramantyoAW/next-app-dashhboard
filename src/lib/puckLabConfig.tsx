'use client';

import { useEffect, useState } from 'react';
import type { Config, DefaultRootProps, RootConfig } from '@puckeditor/core';
import { imageUploadField, imageUploadFieldOpt } from './puckImageField';
import { ProductCard, ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import { usePuckDynamic } from '@/lib/puckDynamic';
import { CartView } from '@/components/storefront/CartView';
import { CheckoutForm } from '@/components/storefront/CheckoutForm';
import { BannerView, type BannerSlide, type BannerProps } from '@/components/storefront/ui/BannerBlock';

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
/** Blok HTML kustom — owner menempel HTML/CSS bebas (Model A: string di JSON). */
type HtmlSnippetProps = { code: string };
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
type CartSlotProps = {
  heading: string;
};
type CheckoutSlotProps = {
  heading: string;
};
type CategorySlotProps = {
  heading: string;
  limit: number;
};
type CtaProps = { heading: string; body: string; button_text: string; link: string };
type FaqItem = { q: string; a: string };
type FaqProps = { heading: string; items: FaqItem[] };
type StoreFooterLink = { label: string; href: string };
/** Platform sosial media — render ikon otomatis dari nilai platform. */
type StoreSocial = { platform: string; label?: string; href: string };
/** Metode pembayaran yang ditampilkan (badge teks/ikon). */
type StorePayment = { key: string; label: string };

/** Batas maks ukuran HTML kustom per blok (Model A: string di JSON halaman). */
export const MAX_SNIPPET_CHARS = 30_000;

/** Path SVG logo brand (simple-icons, CC0) per platform — dirender sebagai ikon. */
const SOCIAL_BRAND_PATHS: Record<string, string> = {
  instagram:
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  tiktok:
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  facebook:
    'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
};

/** Ikon envelope (email) — path mandiri (24x24). */
const EMAIL_PATH = 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.236-8 4.882-8-4.882V6h16v2.236z';

/** Opsi platform sosmed + label otomatisnya. */
const SOCIAL_PLATFORMS: { value: string; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: SOCIAL_BRAND_PATHS.instagram },
  { value: 'whatsapp', label: 'WhatsApp', icon: SOCIAL_BRAND_PATHS.whatsapp },
  { value: 'tiktok', label: 'TikTok', icon: SOCIAL_BRAND_PATHS.tiktok },
  { value: 'facebook', label: 'Facebook', icon: SOCIAL_BRAND_PATHS.facebook },
  { value: 'youtube', label: 'YouTube', icon: SOCIAL_BRAND_PATHS.youtube },
  { value: 'x', label: 'X (Twitter)', icon: SOCIAL_BRAND_PATHS.x },
  { value: 'email', label: 'Email', icon: EMAIL_PATH },
];

/** Daftar metode pembayaran umum Indonesia untuk footer. */
const PAYMENT_OPTIONS: StorePayment[] = [
  { key: 'BCA', label: 'BCA' },
  { key: 'MANDIRI', label: 'Mandiri' },
  { key: 'BRI', label: 'BRI' },
  { key: 'BNI', label: 'BNI' },
  { key: 'OVO', label: 'OVO' },
  { key: 'GOPAY', label: 'GoPay' },
  { key: 'DANA', label: 'DANA' },
  { key: 'QRIS', label: 'QRIS' },
  { key: 'SHOPEEPAY', label: 'ShopeePay' },
  { key: 'COD', label: 'COD' },
];

/** Deteksi platform dari label lama (mis. "Instagram" / "WA" / "Tiktok"). */
function detectSocialPlatform(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('whatsapp') || l === 'wa') return 'whatsapp';
  if (l.includes('instagram') || l === 'ig') return 'instagram';
  if (l.includes('tiktok') || l === 'tt') return 'tiktok';
  if (l.includes('facebook') || l === 'fb') return 'facebook';
  if (l.includes('youtube') || l === 'yt') return 'youtube';
  if (l === 'x' || l.includes('twitter')) return 'x';
  if (l.includes('email')) return 'email';
  return 'instagram';
}

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
  socials: StoreSocial[];
  payments: StorePayment[];
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
  Banner: BannerProps;
  Text: TextProps;
  HtmlSnippet: HtmlSnippetProps;
  Products: ProductsProps;
  ProductSlot: ProductSlotProps;
  CartSlot: CartSlotProps;
  CheckoutSlot: CheckoutSlotProps;
  CategorySlot: CategorySlotProps;
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

/** Slot keranjang dinamis — merender CartView asli di dalam kanvas. */
function CartSlotView({ heading }: CartSlotProps) {
  const { hash } = usePuckDynamic();
  if (!hash) {
    return <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text, #17150f)' }}>Keranjang (slot dinamis)</div>;
  }
  return (
    <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
      {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
      <CartView hash={hash} jumpToCheckout={false} />
    </div>
  );
}

/** Slot checkout dinamis — merender CheckoutForm asli di dalam kanvas. */
function CheckoutSlotView({ heading }: CheckoutSlotProps) {
  const { hash } = usePuckDynamic();
  if (!hash) {
    return <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text, #17150f)' }}>Checkout (slot dinamis)</div>;
  }
  return (
    <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
      {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
      <CheckoutForm hash={hash} />
    </div>
  );
}

/** Slot produk kategori dinamis — fetch produk kategori aktif & render grid. */
function CategorySlotView({ heading, limit }: CategorySlotProps) {
  const { hash, categorySlug } = usePuckDynamic();
  const [items, setItems] = useState<StorefrontProduct[]>([]);
  const [state, setState] = useState<'loading' | 'done'>('loading');
  const n = Math.min(limit || 50, 50);

  useEffect(() => {
    if (!hash || !categorySlug) {
      setState('done');
      return;
    }
    let on = true;
    (async () => {
      try {
        const { gqlFetch } = await import('@/lib/graphqlClient');
        const res = await gqlFetch<{ storefrontProductsByCategory: StorefrontProduct[] | null }>(
          `query($web_store_slug: String!, $category_slug: String!, $limit: Int) {
            storefrontProductsByCategory(web_store_slug: $web_store_slug, category_slug: $category_slug, limit: $limit) {
              id price_override image is_active
              master_product { id sku name price image }
            }
          }`,
          { web_store_slug: hash, category_slug: categorySlug, limit: n }
        );
        if (on) {
          setItems((res?.storefrontProductsByCategory ?? []).filter((p) => p.is_active !== false));
          setState('done');
        }
      } catch {
        if (on) setState('done');
      }
    })();
    return () => {
      on = false;
    };
  }, [hash, categorySlug, n]);

  if (!hash) {
    return <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text, #17150f)' }}>Produk Kategori (slot dinamis)</div>;
  }
  return (
    <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
      {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
      {items.length === 0 && state === 'loading' ? (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--muted, #7a7568)' }}>Memuat produk...</div>
      ) : (
        <ProductGrid hash={hash} products={items} />
      )}
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

    Banner: {
      label: 'Banner Slider',
      fields: {
        slides: {
          type: 'array',
          label: 'Slide Banner',
          getItemSummary: (item) =>
            (item as { heading?: string } | undefined)?.heading ||
            (item as { product_sku?: string } | undefined)?.product_sku ||
            'Slide',
          arrayFields: {
            mode: {
              type: 'radio',
              label: 'Jenis',
              options: [
                { label: 'Manual (gambar/teks sendiri)', value: 'manual' },
                { label: 'Dari Produk (pilih SKU)', value: 'product' },
              ],
            },
            product_sku: { type: 'text', label: 'SKU Produk (mode Produk)' },
            image_url: imageUploadFieldOpt(),
            heading: { type: 'text', label: 'Judul' },
            subheading: { type: 'textarea', label: 'Subjudul / Harga' },
            cta_text: { type: 'text', label: 'Teks Tombol' },
            cta_link: { type: 'text', label: 'Link Tombol (path/url)' },
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
        align: {
          type: 'radio',
          label: 'Posisi Teks',
          options: [
            { label: 'Kiri', value: 'left' },
            { label: 'Tengah', value: 'center' },
            { label: 'Kanan', value: 'right' },
          ],
        },
        height: { type: 'number', label: 'Tinggi (px)', min: 200, max: 900 },
        dark: {
          type: 'radio',
          label: 'Gelapkan Gambar',
          options: [
            { label: 'Ya', value: 'yes' },
            { label: 'Tidak', value: 'no' },
          ],
        },
      },
      defaultProps: {
        slides: [
          { mode: 'manual', heading: 'Banner pertama', subheading: 'Cobalah ubah atau pilih produk otomatis.', cta_text: 'Belanja', cta_link: '#', image_url: 'https://picsum.photos/seed/ombotB1/1600/500' },
          { mode: 'manual', heading: 'Banner kedua', subheading: 'Tambah slide lain di panel kanan.', cta_text: 'Lihat', cta_link: '#', image_url: 'https://picsum.photos/seed/ombotB2/1600/500' },
        ],
        autoplay: 'yes',
        interval: 4,
        align: 'center',
        height: 400,
        dark: 'yes',
      },
      render: BannerView,
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

    HtmlSnippet: {
      label: 'HTML Kustom',
      fields: {
        code: {
          type: 'textarea',
          label: 'Kode HTML/CSS',
          // rows: 8,
        },
      },
      defaultProps: { code: '<!-- Tempel HTML di sini. CSS inline boleh; script aktif -->\n<div style="padding:24px;background:#fff3cd;border-radius:12px;text-align:center">\n  <strong>Promo spesial!</strong> Gunakan kode <code>HEMAT10</code>.\n</div>' },
      render: ({ code }) => {
        // Owner dipercaya (setara custom JS global tema) — dirender as-is.
        if (!code) return <></>;
        const tooBig = code.length > MAX_SNIPPET_CHARS;
        if (tooBig) {
          return (
            <div className="px-6 py-6 text-center text-sm text-amber-700 bg-amber-50">
              HTML melebihi batas {MAX_SNIPPET_CHARS.toLocaleString('id')} karakter — persingkat dulu.
            </div>
          );
        }
        // eslint-disable-next-line react/no-danger
        return <div className="html-snippet" dangerouslySetInnerHTML={{ __html: code }} />;
      },
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

    CartSlot: {
      label: 'Slot Keranjang',
      fields: {
        heading: { type: 'text', label: 'Judul Section' },
      },
      defaultProps: { heading: '' },
      render: CartSlotView,
    },

    CheckoutSlot: {
      label: 'Slot Checkout',
      fields: {
        heading: { type: 'text', label: 'Judul Section' },
      },
      defaultProps: { heading: '' },
      render: CheckoutSlotView,
    },

    CategorySlot: {
      label: 'Slot Produk Kategori',
      fields: {
        heading: { type: 'text', label: 'Judul Section' },
        limit: { type: 'number', label: 'Jumlah Produk', min: 1, max: 50 },
      },
      defaultProps: { heading: 'Produk', limit: 50 },
      render: CategorySlotView,
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
          getItemSummary: (item) => {
            const s = item as Partial<StoreSocial>;
            const p = SOCIAL_PLATFORMS.find((x) => x.value === s.platform);
            return (s.label || p?.label || s.platform || 'Sosial') as string;
          },
          arrayFields: {
            platform: {
              type: 'select',
              label: 'Platform (ikon otomatis)',
              options: SOCIAL_PLATFORMS.map((p) => ({ label: p.label, value: p.value })),
            },
            label: { type: 'text', label: 'Label teks (opsional)' },
            href: { type: 'text', label: 'Link (mis. https://instagram.com/…)' },
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
        payments: {
          type: 'array',
          label: 'Metode Pembayaran',
          getItemSummary: (item) => (item as StorePayment)?.label || 'Bayar',
          arrayFields: {
            key: {
              type: 'select',
              label: 'Metode',
              options: PAYMENT_OPTIONS.map((p) => ({ label: p.label, value: p.key })),
            },
            label: { type: 'text', label: 'Label (opsional, default = metode)' },
          },
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
          { platform: 'instagram', href: '#' },
          { platform: 'whatsapp', href: '#' },
        ],
        show_payments: 'yes',
        payments: [
          { key: 'BCA', label: 'BCA' },
          { key: 'QRIS', label: 'QRIS' },
          { key: 'COD', label: 'COD' },
        ],
        copyright_text: '© 2026 Toko Saya. Hak cipta dilindungi.',
      },
      render: ({ logo_mode, logo_image, about_text, show_about, show_links, links_title, links, show_social, socials_title, socials, show_payments, payments, copyright_text }) => {
        // Data lama tanpa field toggle → default tampil (kecuali 'no').
        const lm = logo_mode || 'text';
        const aboutOn = show_about !== 'no';
        const linksOn = show_links !== 'no';
        const socialOn = show_social !== 'no';
        const payOn = show_payments !== 'no';
        const linkList = links ?? [];
        const socialList = (socials ?? []).map((s) => {
          // Backward compat: data lama { label, href } → deteksi platform dari label.
          const platform = (s.platform as string) || detectSocialPlatform(String(s.label || ''));
          const p = SOCIAL_PLATFORMS.find((x) => x.value === platform);
          return { ...s, platform, icon: p?.icon || SOCIAL_BRAND_PATHS.instagram || '•', label: s.label || p?.label || platform };
        });
        const payList = Array.isArray(payments) && payments.length > 0 ? payments : [];
        const payFromOptions = (k: string) => PAYMENT_OPTIONS.find((p) => p.key === k)?.label || k;
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
                  {lm !== 'image' && <span className="text-base font-black tracking-wide">{lm === 'both' ? '' : 'TOKO SAYA'}</span>}
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
                  <div className="flex flex-wrap gap-2">
                    {socialList.map((s, i) => (
                      <a
                        key={i}
                        href={s.href || '#'}
                        title={s.label || s.platform}
                        aria-label={s.label || s.platform}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: 'var(--bg, #f4f1ea)', color: 'var(--text, #17150f)' }}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d={s.icon} />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Pembayaran */}
              {payOn && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Pembayaran</div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    {(payList.length > 0 ? payList : []).map((p, i) => (
                      <span key={i} className="rounded border border-white/30 px-1.5 py-0.5 opacity-90">
                        {p.label || payFromOptions(String(p.key))}
                      </span>
                    ))}
                    {payList.length === 0 && ['BCA', 'OVO', 'GOPAY', 'QRIS'].map((p) => (
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
