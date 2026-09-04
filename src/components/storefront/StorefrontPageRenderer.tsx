import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatIDR } from '@/lib/cart';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { normalizeBlock } from '@/lib/blockSchema';
import { ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';
import { CustomBlockRenderer, VideoEmbed } from '@/components/storefront/CustomBlockRenderer';

type Block = {
  type: string;
  [key: string]: unknown;
};

/** Konversi block (lama/baru) → struktural + helper akses. */
function resolve(b: Block) {
  const s = normalizeBlock(b, 0);
  const props = (s.props ?? {}) as Record<string, any>;
  const style = (s.style ?? {}) as Record<string, any>;
  return { props, style };
}

function sectionStyle(style: Record<string, any>, extra?: Record<string, string>): CSSProperties {
  const out: Record<string, string> = { ...(extra ?? {}) };
  if (style.bg_color) out.backgroundColor = String(style.bg_color);
  if (style.bg_image) {
    out.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${style.bg_image})`;
    out.backgroundSize = 'cover';
    out.backgroundPosition = 'center';
  }
  if (style.text_color) out.color = String(style.text_color);
  if (style.padding) out.padding = String(style.padding);
  if (style.radius !== undefined && style.radius !== null && style.radius !== '') out.borderRadius = `${style.radius}px`;
  if (style.align) out.textAlign = String(style.align);
  return out;
}

/**
 * Renders a dynamic page's block array into storefront HTML.
 * Blocks: hero, text, products, cta, faq — reads structured props + style.
 *
 * Hero block supports `layout` prop: 'centered' (default) or 'split' (editorial 2-col).
 */
export async function StorefrontPageRenderer({
  blocks,
  hash,
  products,
  bannerUrl,
}: {
  blocks: Block[];
  hash: string;
  products: StorefrontProduct[];
  bannerUrl?: string | null;
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: 'var(--muted, #7a7568)' }}>
        Halaman ini belum memiliki blok.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {blocks.map((block, idx) => {
        const { props: b, style } = resolve(block);
        switch (block.type) {
          /* ───────────────────────────── HERO ───────────────────────────── */
          case 'hero': {
            const heroImage = String(b.image_url ?? '').trim() || bannerUrl || '';
            const layout = String(b.layout ?? 'centered');
            const eyebrow = String(b.eyebrow ?? '').trim();
            const heading = b.heading ?? '';
            const subheading = b.subheading ?? '';
            const ctaText = b.cta_text ?? '';
            const ctaLink = b.cta_link || '#products';

            /* ── Split layout (editorial 2-column) ── */
            if (layout === 'split' && heroImage) {
              return (
                <section
                  key={idx}
                  className="grid items-center gap-8 py-4 lg:grid-cols-2 lg:gap-14"
                  style={sectionStyle(style)}
                >
                  {/* Text side */}
                  <div className="flex flex-col gap-4">
                    {eyebrow && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.24em]"
                        style={{ color: 'var(--muted, #7a7568)' }}
                      >
                        {eyebrow}
                      </span>
                    )}
                    {heading && (
                      <h1
                        className="text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl"
                        style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
                      >
                        {heading}
                      </h1>
                    )}
                    {subheading && (
                      <p className="max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted, #7a7568)' }}>
                        {subheading}
                      </p>
                    )}
                    {ctaText && (
                      <div className="pt-2">
                        <Link
                          href={ctaLink}
                          className="inline-block border-b-2 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                          style={{ color: 'var(--brand, #8a6f4d)', borderColor: 'var(--brand, #8a6f4d)' }}
                        >
                          {ctaText}
                        </Link>
                      </div>
                    )}
                  </div>
                  {/* Image side */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--text,#17150f)]/5 lg:aspect-auto lg:h-[520px]">
                    <StorefrontImage
                      src={heroImage}
                      alt={String(heading)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </section>
              );
            }

            /* ── Centered layout (default) ── */
            const heroStyle = heroImage
              ? {
                  ...sectionStyle(style),
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url(${heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : sectionStyle(style, {
                  background: `linear-gradient(135deg, var(--text, #17150f), #2a2420)`,
                });

            const fullWidth = String((style as Record<string, unknown>).full_width ?? 'container') === 'full';
            const innerContent = (
              <div className="mx-auto max-w-3xl">
                {eyebrow && (
                  <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">
                    {eyebrow}
                  </span>
                )}
                {heading && (
                  <h1
                    className="text-3xl font-medium tracking-tight sm:text-5xl"
                    style={{ color: 'white' }}
                  >
                    {heading}
                  </h1>
                )}
                {subheading && (
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                    {subheading}
                  </p>
                )}
                {ctaText && (
                  <div className="pt-5">
                    <Link
                      href={ctaLink}
                      className="inline-block border-b-2 border-white/60 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-opacity hover:border-white hover:opacity-80"
                    >
                      {ctaText}
                    </Link>
                  </div>
                )}
              </div>
            );

            if (fullWidth) {
              return (
                <div
                  key={idx}
                  className="hero-full-bleed"
                  style={{ width: '100vw', position: 'relative', left: '50%', marginLeft: '-50vw' }}
                >
                  <section className="px-6 py-16 text-center sm:py-24" style={heroStyle}>
                    {innerContent}
                  </section>
                </div>
              );
            }

            return (
              <section
                key={idx}
                className="overflow-hidden px-6 py-16 text-center sm:py-24"
                style={heroStyle}
              >
                {innerContent}
              </section>
            );
          }

          /* ───────────────────────────── TEXT ───────────────────────────── */
          case 'text':
            return (
              <section key={idx} className="py-2" style={sectionStyle(style)}>
                {b.heading && (
                  <h2
                    className="text-xl font-medium tracking-tight sm:text-2xl"
                    style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
                  >
                    {b.heading}
                  </h2>
                )}
                {b.body && (
                  <div
                    className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed sm:text-base"
                    style={{ color: 'var(--muted, #7a7568)' }}
                  >
                    {b.body}
                  </div>
                )}
              </section>
            );

          /* ───────────────────────────── PRODUCTS ───────────────────────────── */
          case 'products':
            return (
              <section key={idx} id="products" className="scroll-mt-24">
                <ProductGrid
                  hash={hash}
                  products={products.slice(0, Number(b.limit) || products.length)}
                  heading={b.heading ? String(b.heading) : undefined}
                  count
                />
              </section>
            );

          /* ───────────────────────────── CTA ───────────────────────────── */
          case 'cta':
            return (
              <section
                key={idx}
                className="px-6 py-14 text-center sm:py-20"
                style={sectionStyle(style, {
                  background: 'var(--text, #17150f)',
                  color: 'var(--bg, #f4f1ea)',
                })}
              >
                {b.heading && (
                  <h2
                    className="text-2xl font-medium tracking-tight sm:text-3xl"
                    style={{ fontFamily: 'var(--font)' }}
                  >
                    {b.heading}
                  </h2>
                )}
                {b.body && (
                  <p className="mx-auto mt-3 max-w-xl text-sm opacity-70 sm:text-base">{b.body}</p>
                )}
                {b.button_text && (
                  <div className="pt-5">
                    <Link
                      href={b.button_link || '#products'}
                      className="inline-block border-b-2 border-current/40 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                      style={{ color: 'var(--brand, #d6ff3f)' }}
                    >
                      {b.button_text}
                    </Link>
                  </div>
                )}
              </section>
            );

          /* ───────────────────────────── FAQ ───────────────────────────── */
          case 'faq':
            return (
              <section key={idx} className="py-2" style={sectionStyle(style)}>
                {b.heading && (
                  <h2
                    className="mb-5 text-xl font-medium tracking-tight sm:text-2xl"
                    style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}
                  >
                    {b.heading}
                  </h2>
                )}
                <div className="divide-y" style={{ borderColor: 'var(--text, #17150f)', opacity: 0.1 }}>
                  {(b.items ?? []).map((it: any, i: number) => (
                    <details key={i} className="group py-4">
                      <summary
                        className="cursor-pointer text-sm font-medium list-none flex items-center justify-between"
                        style={{ color: 'var(--text, #17150f)' }}
                      >
                        <span>{it.q}</span>
                        <span className="ml-4 text-lg transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: 'var(--muted, #7a7568)' }}
                      >
                        {it.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            );

          /* ───────────────────────────── CUSTOM ───────────────────────────── */
          case 'custom':
            return <CustomBlockRenderer key={idx} html={String(b.html ?? '')} css={String(b.css ?? '')} js={String(b.js ?? '')} />;

          /* ───────────────────────────── IMAGE ───────────────────────────── */
          case 'image':
            return (
              <section
                key={idx}
                className="flex justify-center"
                style={{ justifyContent: style.align === 'center' ? 'center' : style.align === 'right' ? 'flex-end' : 'flex-start' }}
              >
                <img
                  src={String(b.image_url ?? '')}
                  alt={String(b.alt ?? '')}
                  className="object-cover"
                  style={{
                    maxWidth: style.max_width ?? '100%',
                    width: '100%',
                    borderRadius: style.radius != null ? `${style.radius}px` : undefined,
                  }}
                />
              </section>
            );

          /* ───────────────────────────── VIDEO ───────────────────────────── */
          case 'video':
            return (
              <section
                key={idx}
                className="overflow-hidden"
                style={{
                  aspectRatio: style.aspect ?? '16 / 9',
                  borderRadius: style.radius != null ? `${style.radius}px` : undefined,
                }}
              >
                <VideoEmbed url={String(b.video_url ?? '')} />
              </section>
            );

          /* ───────────────────────────── DIVIDER ───────────────────────────── */
          case 'divider':
            return (
              <hr
                key={idx}
                className="w-full border-0"
                style={{
                  borderTop: `${style.height ?? 1}px solid ${style.color ?? 'var(--text, #17150f)'}`,
                  opacity: 0.1,
                  margin: style.margin ?? '32px 0',
                }}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
