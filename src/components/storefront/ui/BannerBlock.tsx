'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { productPrice } from '@/lib/storefront-ui';
import { formatIDR } from '@/lib/cart';
import { usePuckDynamic } from '@/lib/puckDynamic';

export type BannerSlide = {
  /** Sumber slide: gambar manual ATAU produk asli dari katalog. */
  mode: 'manual' | 'product';
  /** SKU produk utk mode=product — gambar/nama/harga/CTA otomatis. */
  product_sku?: string;
  image_url?: string;
  heading?: string;
  subheading?: string;
  cta_text?: string;
  /** Link tujuan CTA: url lengkap ATAU path relatif (mis. /storefront/x/...). */
  cta_link?: string;
  /** Badge kecil (opsional, mis. "Promo", "Baru"). */
  badge?: string;
};

export type BannerProps = {
  slides: BannerSlide[];
  autoplay: 'yes' | 'no';
  interval: number;
  /** Posisi teks di atas gambar. */
  align: 'left' | 'center' | 'right';
  /** Tinggi banner px. */
  height: number;
  /** Gelapkan gambar supaya teks terbaca. */
  dark: 'yes' | 'no';
};

export function BannerView(props: BannerProps) {
  const { hash } = usePuckDynamic();
  const { slides = [], autoplay = 'no', interval = 4, align = 'center', height = 400, dark = 'yes' } = props;
  const [active, setActive] = useState(0);
  const [products, setProducts] = useState<Record<string, any> | null>(null);

  // Ambil produk aktif sekali (utk mode=product) bila ada SKU.
  const needProducts = useMemo(
    () => (slides ?? []).some((s) => s.mode === 'product' && s.product_sku),
    [slides]
  );
  useEffect(() => {
    if (!hash || !needProducts) return;
    let on = true;
    (async () => {
      try {
        const { gqlFetch } = await import('@/lib/graphqlClient');
        const res = await gqlFetch<{ storefrontProducts: any[] | null }>(
          `query($slug: String!, $limit: Int) {
            storefrontProducts(web_store_slug: $slug, limit: $limit) {
              id price_override image is_active
              master_product { id sku name price image }
            }
          }`,
          { slug: hash, limit: 50 }
        );
        if (on) {
          const bySku: Record<string, any> = {};
          for (const p of res?.storefrontProducts ?? []) {
            const sku = p?.master_product?.sku;
            if (sku) bySku[sku] = p;
          }
          setProducts(bySku);
        }
      } catch {
        if (on) setProducts({});
      }
    })();
    return () => {
      on = false;
    };
  }, [hash, needProducts]);

  const n = Math.max(slides.length, 1);
  const safeIdx = Math.min(active, n - 1);
  useEffect(() => {
    if (autoplay !== 'yes' || n <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), Math.max(interval, 1) * 1000);
    return () => clearInterval(t);
  }, [autoplay, interval, n]);

  if (!slides || slides.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm"
        style={{ height: height, color: 'var(--muted, #6f6a63)', fontFamily: 'var(--font-body)' }}
      >
        Banner kosong — pilih gambar/produk di panel kanan.
      </div>
    );
  }

  const alignCls =
    align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
  const inner = 'mx-auto max-w-7xl px-6';

  const resolveSlide = (s: BannerSlide) => {
    const prod = s.mode === 'product' && s.product_sku ? products?.[s.product_sku] : undefined;
    const mp = prod?.master_product;
    const price = prod ? productPrice(prod) : null;
    const image = (s.image_url || prod?.image || mp?.image) || '';
    const heading = (s.mode === 'product' ? (s.heading || mp?.name || '') : s.heading) || '';
    const sub = s.mode === 'product'
      ? (s.subheading || (price != null ? formatIDR(price) : ''))
      : (s.subheading || '');
    const ctaText = (s.mode === 'product' && !s.cta_text) ? 'Beli Sekarang' : (s.cta_text || '');
    let ctaLink = s.cta_link || '';
    if (s.mode === 'product' && prod) {
      const sku = mp?.sku || s.product_sku;
      ctaLink = ctaLink || (sku ? `/storefront/${hash}/products/${sku}` : '');
    }
    return { ...s, prod, price, image, heading, sub, ctaText, ctaLink };
  };

  const view = resolveSlide(slides[safeIdx]);

  return (
    <div className="px-6 py-4" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="relative w-full overflow-hidden rounded-3xl" style={{ height }}>
        {view.image ? (
          <StorefrontImage
            src={view.image}
            alt={view.heading || 'Banner'}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--surface, #faf9f6)' }} />
        )}
        {dark === 'yes' && <div className="absolute inset-0 bg-black/40" />}

        <div className={`absolute inset-0 flex ${alignCls}`}>
          <div className={`${inner} flex w-full flex-col justify-center gap-2 text-white`}>
            {view.badge ? (
              <span
                className="inline-flex w-fit rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ background: 'var(--accent, #c5a880)', color: 'var(--text, #161616)' }}
              >
                {view.badge}
              </span>
            ) : null}
            {view.heading ? (
              <h2 className="max-w-2xl text-3xl font-medium leading-tight drop-shadow sm:text-4xl lg:text-5xl" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
                {view.heading}
              </h2>
            ) : null}
            {view.sub ? <p className="max-w-xl text-sm drop-shadow sm:text-base">{view.sub}</p> : null}
            {view.ctaText && view.ctaLink ? (
              <span className="mt-2">
                <Link
                  href={view.ctaLink}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: 'var(--accent, #c5a880)', color: 'var(--text, #161616)' }}
                >
                  {view.ctaText}
                </Link>
              </span>
            ) : null}
          </div>
        </div>

        {n > 1 ? (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + n) % n)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow transition hover:bg-white"
              aria-label="Sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % n)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow transition hover:bg-white"
              aria-label="Berikutnya"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIdx ? 'w-5 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
