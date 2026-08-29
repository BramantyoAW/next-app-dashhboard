import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatIDR } from '@/lib/cart';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { normalizeBlock } from '@/lib/blockSchema';

type SP = {
  id: string;
  price_override: number | null;
  image: string | null;
  is_active: boolean;
  master_product: { id: string; sku: string; name: string; description: string | null; price: number; image: string | null };
};

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
 * Blok lama (flat) tetap dirender via normalizeBlock.
 */
export async function StorefrontPageRenderer({
  blocks,
  hash,
  products,
}: {
  blocks: Block[];
  hash: string;
  products: SP[];
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="rounded-xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
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
                className="rounded-2xl px-6 py-12 text-center text-white"
                style={sectionStyle(style)}
              >
                <h1 className="text-3xl font-extrabold sm:text-4xl">{b.heading}</h1>
                {b.subheading && <p className="mt-2 text-sm opacity-90 sm:text-base">{b.subheading}</p>}
                {b.cta_text && (
                  <Link
                    href={b.cta_link || '#products'}
                    className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-slate-900 shadow hover:opacity-90"
                  >
                    {b.cta_text}
                  </Link>
                )}
              </section>
            );
          case 'text':
            return (
              <section key={idx} className="rounded-2xl border bg-white p-6" style={sectionStyle(style)}>
                {b.heading && <h2 className="text-xl font-bold text-slate-900">{b.heading}</h2>}
                {b.body && (
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{b.body}</div>
                )}
              </section>
            );
          case 'products':
            return (
              <section key={idx} id="products">
                {b.heading && <h2 className="mb-4 text-xl font-bold text-slate-900">{b.heading}</h2>}
                {products.length === 0 ? (
                  <div className="rounded-xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
                    Belum ada produk untuk ditampilkan.
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {products.slice(0, Number(b.limit) || products.length).map((p) => {
                      const price = p.price_override ?? p.master_product.price;
                      const img = p.image ?? p.master_product.image ?? null;
                      return (
                        <li key={p.id} className="group rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md">
                          <Link
                            href={`/storefront/${hash}/products/${p.master_product.sku ?? p.id}`}
                            className="block"
                          >
                            <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt={p.master_product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                                  no image
                                </div>
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
              </section>
            );
          case 'cta':
            return (
              <section key={idx} className="rounded-2xl px-6 py-10 text-center text-white" style={sectionStyle(style, { background: 'linear-gradient(to right, #4f46e5, #2563eb)' })}>
                <h2 className="text-xl font-bold sm:text-2xl">{b.heading}</h2>
                {b.body && <p className="mt-1 text-sm opacity-90">{b.body}</p>}
                {b.button_text && (
                  <Link
                    href={b.button_link || '#products'}
                    className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-indigo-700 shadow hover:opacity-90"
                  >
                    {b.button_text}
                  </Link>
                )}
              </section>
            );
          case 'faq':
            return (
              <section key={idx} className="rounded-2xl border bg-white p-6">
                {b.heading && <h2 className="mb-3 text-xl font-bold text-slate-900">{b.heading}</h2>}
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
          default:
            return null;
        }
      })}
    </div>
  );
}
