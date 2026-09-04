'use client';

import type { Config, DefaultRootProps, RootConfig } from '@puckeditor/core';

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
  logo_text: string;
  show_search: 'yes' | 'no';
  menu_1: string;
  menu_2: string;
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
type ProductsProps = { heading: string; limit: number };
type CtaProps = { heading: string; body: string; button_text: string; link: string };
type FaqItem = { q: string; a: string };
type FaqProps = { heading: string; items: FaqItem[] };
type StoreFooterProps = {
  about_text: string;
  show_payments: 'yes' | 'no';
  copyright_text: string;
};

type ComponentProps = {
  StoreHeader: StoreHeaderProps;
  Hero: HeroProps;
  Text: TextProps;
  Products: ProductsProps;
  Cta: CtaProps;
  Faq: FaqProps;
  StoreFooter: StoreFooterProps;
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

export const puckLabConfig: Config<ComponentProps> = {
  root: Root,
  components: {
    StoreHeader: {
      label: 'Header Toko (custom)',
      fields: {
        logo_text: { type: 'text', label: 'Teks Logo' },
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
      defaultProps: { logo_text: 'TOKO SAYA', show_search: 'yes', menu_1: 'Tentang', menu_2: 'Cara Order', cta_text: 'Pesan', sticky: 'yes' },
      render: ({ logo_text, show_search, menu_1, menu_2, cta_text, sticky }) => (
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
          <div className="font-bold tracking-wide" style={{ color: 'var(--brand, #d6ff3f)' }}>{logo_text}</div>
          <div className="flex items-center gap-4 text-sm">
            <span>{menu_1}</span>
            <span>{menu_2}</span>
            {show_search === 'yes' && <span className="rounded-full border border-white/30 px-3 py-0.5 text-xs opacity-70">🔍 Cari...</span>}
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--brand, #d6ff3f)', color: 'var(--text, #17150f)' }}>
              {cta_text}
            </span>
          </div>
        </div>
      ),
    },

    Hero: {
      label: 'Hero / Banner',
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        heading: { type: 'text', label: 'Judul' },
        subheading: { type: 'textarea', label: 'Subjudul' },
        cta_text: { type: 'text', label: 'Teks Tombol' },
        image_url: { type: 'text', label: 'URL Gambar' },
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
        limit: { type: 'number', label: 'Jumlah Produk', min: 1, max: 12 },
      },
      defaultProps: { heading: 'Menu Favorit', limit: 4 },
      render: ({ heading, limit }) => (
        <div className="px-6 py-4" style={{ fontFamily: 'var(--font)' }}>
          {heading && <h2 className="mb-3 text-xl font-medium" style={{ color: 'var(--text, #17150f)' }}>{heading}</h2>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.min(limit || 4, 8) }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-black/10">
                <div className="aspect-square bg-black/5" />
                <div className="p-2 text-xs font-semibold" style={{ color: 'var(--text, #17150f)' }}>Produk {i + 1}</div>
                <div className="px-2 pb-2 text-xs font-bold" style={{ color: 'var(--brand, #8a6f4d)' }}>Rp 25.000</div>
              </div>
            ))}
          </div>
        </div>
      ),
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

    StoreFooter: {
      label: 'Footer Toko',
      fields: {
        about_text: { type: 'textarea', label: 'Teks Tentang' },
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
      defaultProps: { about_text: 'Toko online terpercaya untuk kebutuhan harian Anda.', show_payments: 'yes', copyright_text: '© 2026 Toko Saya. Hak cipta dilindungi.' },
      render: ({ about_text, show_payments, copyright_text }) => (
        <div className="px-6 py-8" style={{ background: 'var(--text, #17150f)', color: 'var(--bg, #f4f1ea)' }}>
          {about_text && <p className="max-w-md text-xs opacity-70">{about_text}</p>}
          {show_payments === 'yes' && (
            <div className="mt-3 flex gap-1.5 text-[10px] font-bold">
              {['BCA', 'OVO', 'GOPAY', 'QRIS'].map((p) => (
                <span key={p} className="rounded border border-white/30 px-1.5 py-0.5 opacity-80">{p}</span>
              ))}
            </div>
          )}
          {copyright_text && <div className="mt-4 text-[10px] opacity-50">{copyright_text}</div>}
        </div>
      ),
    },
  },
};

export default puckLabConfig;
