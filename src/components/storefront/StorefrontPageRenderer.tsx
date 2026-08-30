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
 * Renders a dynamic page's block array (Shopify-style) into storefront HTML.
 * Blocks: hero, text, products, cta, faq — membaca props + style struktural.
 */
export async function StorefrontPageRenderer({
  blocks,
  hash,
  products,
}: {
  blocks: Block[];
  hash: string;
  products: StorefrontProduct[];
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-sm text-slate-500">
        Halaman ini belum memiliki blok.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {blocks.map((block, idx) => {
        const { props: b, style } = resolve(block);
        switch (block.type) {
          case 'hero':
            return (
              <section
                key={idx}
                className="overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:py-20"
                style={sectionStyle(style, { background: 'linear-gradient(135deg, var(--brand, #111), #0f172a)' })}
              >
                <h1 className="mx-auto max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">{b.heading}</h1>
                {b.subheading && <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">{b.subheading}</p>}
                {b.cta_text && (
                  <Link
                    href={b.cta_link || '#products'}
                    className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100"
                  >
                    {b.cta_text}
                  </Link>
                )}
              </section>
            );
          case 'text':
            return (
              <section
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
                style={sectionStyle(style)}
              >
                {b.heading && <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{b.heading}</h2>}
                {b.body && (
                  <div className="mt-2 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{b.body}</div>
                )}
              </section>
            );
          case 'products':
            return (
              <section key={idx} id="products" className="scroll-mt-24">
                {b.heading && <h2 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900">{b.heading}</h2>}
                <ProductGrid hash={hash} products={products.slice(0, Number(b.limit) || products.length)} />
              </section>
            );
          case 'cta':
            return (
              <section
                key={idx}
                className="rounded-3xl px-6 py-12 text-center text-white"
                style={sectionStyle(style, { background: 'linear-gradient(to right, #4f46e5, #2563eb)' })}
              >
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{b.heading}</h2>
                {b.body && <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">{b.body}</p>}
                {b.button_text && (
                  <Link
                    href={b.button_link || '#products'}
                    className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:opacity-90"
                  >
                    {b.button_text}
                  </Link>
                )}
              </section>
            );
          case 'faq':
            return (
              <section key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                {b.heading && <h2 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900">{b.heading}</h2>}
                <div className="space-y-3">
                  {(b.items ?? []).map((it: any, i: number) => (
                    <details key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <summary className="cursor-pointer text-sm font-bold text-slate-800">{it.q}</summary>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          case 'custom':
            return <CustomBlockRenderer key={idx} html={String(b.html ?? '')} css={String(b.css ?? '')} js={String(b.js ?? '')} />;
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
                  className="rounded-2xl object-cover shadow-sm"
                  style={{
                    maxWidth: style.max_width ?? '100%',
                    width: '100%',
                    borderRadius: style.radius != null ? `${style.radius}px` : undefined,
                  }}
                />
              </section>
            );
          case 'video':
            return (
              <section key={idx} className="overflow-hidden rounded-2xl shadow-sm" style={{ aspectRatio: style.aspect ?? '16 / 9', borderRadius: style.radius != null ? `${style.radius}px` : undefined }}>
                <VideoEmbed url={String(b.video_url ?? '')} />
              </section>
            );
          case 'divider':
            return (
              <hr
                key={idx}
                className="w-full border-0"
                style={{
                  borderTop: `${style.height ?? 1}px solid ${style.color ?? '#e2e8f0'}`,
                  margin: style.margin ?? '24px 0',
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
