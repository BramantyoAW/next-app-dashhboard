/**
 * Adapter omBot blocks ↔ Puck data.
 *
 * Aturan arsitektur (disepakati):
 * - omBot TIDAK menimpa plugin Puck. Kita hanya memakai API publik
 *   (@puckeditor/core): definisikan config komponen + simpan JSON data.
 * - Data halaman disimpan di web_pages.blocks sebagai:
 *     { "puck": { root, content }, "legacy": [ ...blok ombot lama ... ] }
 *   Storefront lama membaca `legacy` selama transisi (toko tidak mati);
 *   editor Puck membaca `puck`. Saat renderer storefront Puck selesai,
 *   `legacy` bisa dihapus.
 * - Upgrade Puck = ganti versi package; format data kita tetap karena
 *   hanya JSON {root, content} milik kita.
 */

import type { Data } from '@puckeditor/core';

type LegacyBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  [k: string]: unknown;
};

/** Map tipe blok ombot → nama komponen Puck (defaultProps mengikuti puckLabConfig). */
const TYPE_TO_PUCK: Record<string, string> = {
  header: 'StoreHeader',
  hero: 'Hero',
  text: 'Text',
  products: 'Products',
  cta: 'Cta',
  faq: 'Faq',
  footer: 'StoreFooter',
};

export function isPuckStored(blocks: unknown): boolean {
  return !!blocks && typeof blocks === 'object' && !Array.isArray(blocks) && 'puck' in (blocks as Record<string, unknown>);
}

export function puckDataOf(blocks: unknown): Data | null {
  if (!isPuckStored(blocks)) return null;
  const p = (blocks as { puck?: unknown }).puck as Data | null;
  // Hati-hati data korup: puck kosong tapi legacy masih ada isi → jangan
  // pakai puck kosong (nanti Simpan akan menimpa legacy dengan kosong).
  if (p && Array.isArray(p.content) && p.content.length === 0) {
    const legacy = legacyOf(blocks);
    if (legacy.length > 0) return null; // fallback: editor mulai dari legacy
  }
  return p;
}

export function legacyOf(blocks: unknown): LegacyBlock[] {
  if (Array.isArray(blocks)) return blocks as LegacyBlock[];
  if (blocks && typeof blocks === 'object' && 'legacy' in (blocks as Record<string, unknown>)) {
    const l = (blocks as { legacy?: unknown }).legacy;
    return Array.isArray(l) ? (l as LegacyBlock[]) : [];
  }
  return [];
}

/** Konversi blok ombot lama → array komponen Puck (content). */
export function legacyToPuckContent(blocks: LegacyBlock[]): Data['content'] {
  const content: Data['content'] = [];
  let n = 0;
  for (const raw of blocks) {
    const src = (raw.props && typeof raw.props === 'object' ? raw.props : raw) as Record<string, unknown>;
    const type = String(raw.type ?? '');
    const puckType = TYPE_TO_PUCK[type];
    if (!puckType) continue; // tipe tak dikenal (custom/list/dll) — dilewati dulu
    const props: Record<string, unknown> = { ...src };
    // peta field lama → field puck config (bila beda nama)
    if (type === 'hero') {
      if (props.title !== undefined && props.heading === undefined) props.heading = props.title;
      if (props.subtitle !== undefined && props.subheading === undefined) props.subheading = props.subtitle;
      if (props.button_text !== undefined && props.cta_text === undefined) props.cta_text = props.button_text;
      if (props.image !== undefined && props.image_url === undefined) props.image_url = props.image;
    }
    if (type === 'text' && props.content !== undefined && props.body === undefined) props.body = props.content;
    if (type === 'cta') {
      if (props.button_text !== undefined && props.button_text !== undefined) props.button_text = props.button_text;
    }
    content.push({
      type: puckType as never,
      props: { id: `puck-${Date.now()}-${n++}`, ...props },
    });
  }
  return content;
}

/** Blok ombot lama → data Puck lengkap (root + content). */
export function legacyToPuckData(blocks: LegacyBlock[]): Data {
  return {
    root: { props: { title: 'Home' } },
    content: legacyToPuckContent(blocks),
    zones: {},
  };
}

/**
 * Halaman default "lahir lengkap" ala Shopify — dipakai saat halaman baru
 * dibuat / halaman kosong. Komponen sesuai puckLabConfig (StoreHeader,
 * Hero, Text, Products, Cta, StoreFooter) sehingga langsung terlihat penuh
 * dan bisa diedit drag&drop.
 */
export function defaultPuckData(): Data {
  return defaultPuckDataFor('home');
}

/** Header toko standar (dipakai semua template halaman). */
function tplHeader(item: (t: string, p: Record<string, unknown>, n: number) => { type: never; props: Record<string, unknown> }, t: number) {
  return item('StoreHeader', { logo_mode: 'both', logo_text: 'TOKO SAYA', logo_image: '', show_search: 'yes', menu_1: 'Tentang', menu_2: 'Produk', menu_3: '', menu_4: '', cta_text: 'Pesan', sticky: 'yes' }, t);
}

/** Footer toko standar (dipakai semua template halaman). */
function tplFooter(item: (t: string, p: Record<string, unknown>, n: number) => { type: never; props: Record<string, unknown> }, t: number) {
  return item('StoreFooter', {
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
    copyright_text: '© ' + new Date().getFullYear() + ' Hak cipta dilindungi.',
  }, t);
}

/**
 * Data awal (default) halaman kanvas per tipe (slug). Halaman dinamis seperti
 * PDP mendapat template dgn SLOT dinamis (ProductSlot) — area produk diisi
 * otomatis dari data aktif saat halaman dibuka di storefront.
 */
export function defaultPuckDataFor(slug: string): Data {
  const t = Date.now();
  const item = (type: string, props: Record<string, unknown>, n: number) => ({
    type: type as never,
    props: { id: `puck-def-${t}-${n}`, ...props },
  });
  const hdr = tplHeader(item, 0);
  const ftr = tplFooter(item, 999);

  if (slug === 'product') {
    return {
      root: { props: { title: 'Produk' } },
      zones: {},
      content: [
        item('StoreHeader', { logo_mode: 'both', logo_text: 'TOKO SAYA', logo_image: '', show_search: 'yes', menu_1: 'Tentang', menu_2: 'Produk', cta_text: 'Pesan', sticky: 'yes' }, 0),
        item('ProductSlot', { cta_text: 'Beli Sekarang' }, 1),
        ftr,
      ],
    };
  }

  return {
    root: { props: { title: 'Home' } },
    zones: {},
    content: [
      hdr,
      item('Hero', { eyebrow: 'SELAMAT DATANG', heading: 'Produk Segar & Berkualitas', subheading: 'Temukan pilihan terbaik toko kami — antar cepat, bayar mudah.', cta_text: 'Belanja Sekarang', image_url: '', align: 'left', dark: 'yes' }, 1),
      item('Text', { heading: 'Tentang Kami', body: 'Ceritakan tentang toko Anda di sini. Ubah teks langsung di kanvas.' }, 2),
      item('Products', { heading: 'Menu Favorit', mode: 'grid', limit: 4, autoplay: 'yes' }, 3),
      item('Cta', { heading: 'Pesan Sekarang!', body: 'Jangan lewatkan promo minggu ini.', button_text: 'Chat WhatsApp', link: '#' }, 4),
      ftr,
    ],
  };
}

export { TYPE_TO_PUCK };
