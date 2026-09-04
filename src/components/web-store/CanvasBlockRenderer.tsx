'use client';

import type { CSSProperties } from 'react';
import type { StructuralBlock } from '@/lib/blockSchema';

/**
 * Live block render untuk canvas builder (mode Stitch).
 *
 * Meniru markup storefront asli (StorefrontPageRenderer) 1:1 — memakai CSS
 * variables tema (--brand, --text, --bg, --muted, --font) sehingga preview
 * sesuai persis dengan hasil akhir. Blok products ditampilkan sebagai
 * placeholder grid (preview editor tidak fetch produk).
 */

function resolveProps(b: StructuralBlock) {
  return (b.props ?? {}) as Record<string, any>;
}

function sectionStyle(style: Record<string, any>, extra?: Record<string, string>): CSSProperties {
  const out: Record<string, string> = { ...(extra ?? {}) };
  if (style.bg_color) out.backgroundColor = String(style.bg_color);
  if (style.text_color) out.color = String(style.text_color);
  if (style.padding) out.padding = String(style.padding);
  if (style.align) out.textAlign = String(style.align);
  return out;
}

export function CanvasBlockRenderer({ block }: { block: StructuralBlock }) {
  const b = resolveProps(block);
  const style = (block.style ?? {}) as Record<string, any>;
  const ss = sectionStyle(style);

  switch (block.type) {
    /* ── HEADER (editable, bukan chrome global) ── */
    case 'header': {
      const sticky = String(b.sticky ?? 'yes') !== 'no';
      const logoUrl = String(b.logo_url ?? '').trim();
      const logoText = String(b.logo_text ?? '').trim() || 'TOKO SAYA';
      const nav: { label?: string; href?: string }[] = Array.isArray(b.nav) ? b.nav : [];
      return (
        <header
          className={sticky ? 'sticky top-0 z-30' : ''}
          style={{
            ...ss,
            background: style.bg_color ? String(style.bg_color) : 'var(--bg, #f4f1ea)',
            color: style.text_color ? String(style.text_color) : 'var(--text, #17150f)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <span className="flex min-w-0 items-center gap-2.5">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={logoText} className="h-8 w-8 shrink-0 rounded object-cover" />
              ) : null}
              <span
                className="truncate text-base font-bold uppercase tracking-[0.14em]"
                style={{ fontFamily: 'var(--font)', color: style.text_color ? String(style.text_color) : 'var(--text, #17150f)' }}
              >
                {logoText}
              </span>
            </span>
            <nav className="ml-auto hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.18em] md:flex">
              {nav.map((n, i) => (
                <span key={i} className="cursor-pointer transition-colors hover:opacity-70">
                  {n.label}
                </span>
              ))}
            </nav>
          </div>
        </header>
      );
    }

    /* ── HERO ── */
    case 'hero': {
      const heroImage = String(b.image_url ?? '').trim();
      const layout = String(b.layout ?? 'centered');
      const eyebrow = String(b.eyebrow ?? '').trim();
      const heading = b.heading ?? '';
      const subheading = b.subheading ?? '';
      const ctaText = b.cta_text ?? '';
      const ctaLink = b.cta_link || '#';

      if (layout === 'split' && heroImage) {
        return (
          <section className="grid items-center gap-8 py-4 lg:grid-cols-2 lg:gap-14" style={ss}>
            <div className="flex flex-col gap-4">
              {eyebrow && (
                <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--muted, #7a7568)' }}>
                  {eyebrow}
                </span>
              )}
              {heading && (
                <h1 className="text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>
                  {heading}
                </h1>
              )}
              {subheading && <p className="max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted, #7a7568)' }}>{subheading}</p>}
              {ctaText && (
                <div className="pt-2">
                  <span className="inline-block border-b-2 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--brand, #8a6f4d)', borderColor: 'var(--brand, #8a6f4d)' }}>
                    {ctaText}
                  </span>
                </div>
              )}
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--text,#17150f)]/5 lg:aspect-auto lg:h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt={String(heading)} className="h-full w-full object-cover" />
            </div>
          </section>
        );
      }

      const heroStyle: CSSProperties = heroImage
        ? {
            ...ss,
            backgroundImage: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : { ...ss, background: 'linear-gradient(135deg, var(--text, #17150f), #2a2420)' };

      return (
        <section className="overflow-hidden px-6 py-16 text-center sm:py-24" style={heroStyle}>
          <div className="mx-auto max-w-3xl">
            {eyebrow && <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">{eyebrow}</span>}
            {heading && <h1 className="text-3xl font-medium tracking-tight sm:text-5xl" style={{ color: 'white' }}>{heading}</h1>}
            {subheading && <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">{subheading}</p>}
            {ctaText && (
              <div className="pt-5">
                <span className="inline-block border-b-2 border-white/60 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{ctaText}</span>
              </div>
            )}
          </div>
        </section>
      );
    }

    /* ── TEXT ── */
    case 'text':
      return (
        <section className="py-2" style={ss}>
          {b.heading && <h2 className="text-xl font-medium tracking-tight sm:text-2xl" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>{b.heading}</h2>}
          {b.body && <div className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted, #7a7568)' }}>{b.body}</div>}
        </section>
      );

    /* ── PRODUCTS (placeholder grid) ── */
    case 'products':
      return (
        <section id="products" className="scroll-mt-24">
          {b.heading && <h2 className="mb-5 text-xl font-medium tracking-tight sm:text-2xl" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>{b.heading}</h2>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: Math.min(Number(b.limit) || 3, 6) }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--text, #17150f)', opacity: 0.1, borderRadius: 'var(--radius, 12px)' }}>
                <div className="aspect-square bg-[var(--text,#17150f)]/5" />
                <div className="p-3">
                  <div className="h-2.5 w-3/4 rounded bg-[var(--text,#17150f)]/10" />
                  <div className="mt-2 h-2.5 w-1/3 rounded bg-[var(--brand,#8a6f4d)]/40" />
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    /* ── CTA ── */
    case 'cta':
      return (
        <section className="px-6 py-14 text-center sm:py-20" style={{ ...ss, background: 'var(--text, #17150f)', color: 'var(--bg, #f4f1ea)' }}>
          {b.heading && <h2 className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ fontFamily: 'var(--font)' }}>{b.heading}</h2>}
          {b.body && <p className="mx-auto mt-3 max-w-xl text-sm opacity-70 sm:text-base">{b.body}</p>}
          {b.button_text && (
            <div className="pt-5">
              <span className="inline-block border-b-2 border-current/40 pb-0.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--brand, #d6ff3f)' }}>
                {b.button_text}
              </span>
            </div>
          )}
        </section>
      );

    /* ── FAQ ── */
    case 'faq':
      return (
        <section className="py-2" style={ss}>
          {b.heading && <h2 className="mb-5 text-xl font-medium tracking-tight sm:text-2xl" style={{ fontFamily: 'var(--font)', color: 'var(--text, #17150f)' }}>{b.heading}</h2>}
          <div className="divide-y" style={{ borderColor: 'var(--text, #17150f)', opacity: 0.1 }}>
            {(Array.isArray(b.items) ? b.items : []).map((it: any, i: number) => (
              <div key={i} className="group py-4">
                <div className="flex items-center justify-between text-sm font-medium" style={{ color: 'var(--text, #17150f)' }}>
                  <span>{it.q}</span>
                  <span className="ml-4 text-lg">+</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted, #7a7568)' }}>{it.a}</p>
              </div>
            ))}
          </div>
        </section>
      );

    /* ── CUSTOM ── */
    case 'custom': {
      const css = String(b.css ?? '');
      const js = String(b.js ?? '');
      return (
        <>
          {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
          <div dangerouslySetInnerHTML={{ __html: String(b.html ?? '') }} />
          {js && (
            <script
              dangerouslySetInnerHTML={{
                __html: js.replace(/<\/script/gi, '<\\/script').replace(/document\.cookie/gi, '').trim(),
              }}
            />
          )}
        </>
      );
    }

    /* ── IMAGE ── */
    case 'image':
      return (
        <section className="flex justify-center" style={{ justifyContent: style.align === 'center' ? 'center' : style.align === 'right' ? 'flex-end' : 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(b.image_url ?? '')}
            alt={String(b.alt ?? '')}
            className="object-cover"
            style={{ maxWidth: style.max_width ?? '100%', width: '100%', borderRadius: style.radius != null ? `${style.radius}px` : undefined }}
          />
        </section>
      );

    /* ── VIDEO ── */
    case 'video': {
      const url = String(b.video_url ?? '');
      const embed = url.includes('youtube.com') || url.includes('youtu.be')
        ? url.replace(/.*(?:youtu\.be\/|v=)([\w-]{6,})/, 'https://www.youtube.com/embed/$1')
        : url;
      return (
        <section className="overflow-hidden" style={{ aspectRatio: style.aspect ?? '16 / 9', borderRadius: style.radius != null ? `${style.radius}px` : undefined }}>
          {url ? (
            <iframe src={embed} className="h-full w-full" allowFullScreen title="video" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--text,#17150f)]/5 text-xs" style={{ color: 'var(--muted, #7a7568)' }}>
              Blok Video — isi URL (YouTube/MP4)
            </div>
          )}
        </section>
      );
    }

    /* ── DIVIDER ── */
    case 'divider':
      return <hr style={{ borderTop: `${style.height ?? 1}px solid ${style.color ?? 'var(--text, #17150f)'}`, margin: style.margin ?? '24px 0', opacity: 0.1 }} />;

    /* ── FOOTER (editable, bukan chrome global) ── */
    case 'footer': {
      const about = String(b.about_text ?? '');
      const copyright = String(b.copyright ?? '').trim();
      const nav: { label?: string; href?: string }[] = Array.isArray(b.nav) ? b.nav : [];
      const socials: { label?: string; url?: string }[] = Array.isArray(b.socials) ? b.socials : [];
      return (
        <footer
          style={{
            ...ss,
            background: style.bg_color ? String(style.bg_color) : 'var(--text, #17150f)',
            color: style.text_color ? String(style.text_color) : 'var(--bg, #f4f1ea)',
          }}
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            <div className="md:col-span-1">
              <p className="max-w-xs text-sm leading-relaxed opacity-70">{about}</p>
            </div>
            {nav.length > 0 && (
              <div className="flex flex-col gap-2 text-sm">
                {nav.map((n, i) => (
                  <span key={i} className="cursor-pointer opacity-80 transition-opacity hover:opacity-100">
                    {n.label}
                  </span>
                ))}
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex flex-col gap-2 text-sm">
                {socials.map((s, i) => (
                  <span key={i} className="cursor-pointer opacity-80 transition-opacity hover:opacity-100">
                    {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 px-4 pt-4 text-xs opacity-60 sm:px-6 lg:px-8">
            {copyright || '© ' + new Date().getFullYear() + ' — Hak cipta dilindungi'}
          </div>
        </footer>
      );
    }

    default:
      return null;
  }
}
