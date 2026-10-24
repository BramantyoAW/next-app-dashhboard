import {
  Type,
  ShoppingBag,
  MousePointerClick,
  HelpCircle,
  Image as ImageIcon,
  Code2,
  PlayCircle,
  Minus,
  PanelTop,
  PanelBottom,
  type LucideIcon,
} from 'lucide-react';

/**
 * Schema-driven section builder — satu source of truth untuk semua tipe blok.
 *
 * Setiap blok punya:
 *  - props   → konten (heading, body, link, dsb.)
 *  - style   → tampilan (warna, padding, radius, align)
 *  - layout  → perilaku layout (opsional, fase berikutnya)
 *
 * Editor (panel properti) dan renderer storefront membaca definisi ini,
 * sehingga menambah blok baru = menambah 1 definisi + 1 komponen render.
 *
 * Struktur JSON blok (disimpan di web_pages.blocks):
 *   { "id": "blk_1", "type": "hero",
 *     "props": { ... }, "style": { ... }, "layout": { ... } }
 */

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'code'
  | 'color'
  | 'number'
  | 'select'
  | 'image'
  | 'repeater'
  | 'url';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Untuk repeater: skema item (mis. FAQ items). */
  item?: { key: string; label: string; kind: 'text' | 'textarea' | 'code' }[];
  itemLabel?: string;
  min?: number;
  max?: number;
  default?: unknown;
};

export type BlockStyle = {
  bg_color?: string | null;
  bg_image?: string | null;
  text_color?: string | null;
  padding?: string | null;
  radius?: number | null;
  align?: 'left' | 'center' | 'right' | null;
  full_width?: 'container' | 'full' | null;
  max_width?: string | null;
  aspect?: string | null;
  height?: number | null;
  color?: string | null;
  margin?: string | null;
};

export type BlockDef = {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Konten */
  props: FieldDef[];
  /** Desain (opsional, disimpan di style) */
  style?: FieldDef[];
  defaults: Record<string, unknown>;
};

/** Tipe blok yang didukung renderer. */
export type BlockType =
  | 'header'
  | 'hero'
  | 'text'
  | 'products'
  | 'cta'
  | 'faq'
  | 'custom'
  | 'image'
  | 'video'
  | 'divider'
  | 'footer';

/** Blok struktural (props + style). */
export type StructuralBlock = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  style: BlockStyle;
  layout?: Record<string, unknown>;
};

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'header',
    label: 'Header Toko',
    description: 'Bilah atas toko: logo, nama, menu navigasi',
    icon: PanelTop,
    defaults: {
      logo_text: 'TOKO SAYA',
      logo_url: '',
      nav: [
        { label: 'Beranda', href: '/' },
        { label: 'Produk', href: '/#produk' },
      ],
      sticky: true,
    },
    props: [
      { key: 'logo_text', label: 'Nama / Logo Teks', kind: 'text', placeholder: 'TOKO SAYA' },
      { key: 'logo_url', label: 'URL Logo (gambar)', kind: 'image', placeholder: 'https://...' },
      {
        key: 'nav',
        label: 'Menu Navigasi',
        kind: 'repeater',
        itemLabel: 'Menu',
        item: [
          { key: 'label', label: 'Teks', kind: 'text' },
          { key: 'href', label: 'Link', kind: 'text' },
        ],
      },
      { key: 'sticky', label: 'Sticky (menempel saat scroll)', kind: 'select', options: [
        { value: 'yes', label: 'Ya' },
        { value: 'no', label: 'Tidak' },
      ] },
    ],
    style: [
      { key: 'bg_color', label: 'Warna Latar Header', kind: 'color' },
      { key: 'text_color', label: 'Warna Teks', kind: 'color' },
      { key: 'padding', label: 'Padding', kind: 'text', placeholder: '0 24px' },
    ],
  },
  {
    type: 'hero',
    label: 'Hero / Banner Utama',
    description: 'Banner besar dengan judul, subjudul & tombol',
    icon: ImageIcon,
    defaults: {
      heading: 'Judul Hero',
      subheading: 'Sub judul / tagline',
      cta_text: 'Belanja Sekarang',
      cta_link: '#products',
      image_url: '',
      bg_color: '#1e293b',
      text_color: '#ffffff',
      padding: '64px 24px',
      radius: 16,
      align: 'center',
    },
    props: [
      { key: 'heading', label: 'Judul', kind: 'text', placeholder: 'Judul utama' },
      { key: 'subheading', label: 'Subjudul', kind: 'textarea', placeholder: 'Tagline / deskripsi singkat' },
      { key: 'cta_text', label: 'Teks Tombol', kind: 'text', placeholder: 'Belanja Sekarang' },
      { key: 'cta_link', label: 'Link Tombol', kind: 'text', placeholder: '#products' },
      { key: 'image_url', label: 'URL Gambar Latar', kind: 'image', placeholder: 'https://...' },
    ],
    style: [
      { key: 'bg_color', label: 'Warna Latar', kind: 'color' },
      { key: 'text_color', label: 'Warna Teks', kind: 'color' },
      { key: 'padding', label: 'Padding', kind: 'text', placeholder: '64px 24px' },
      { key: 'radius', label: 'Radius Sudut', kind: 'number', min: 0, max: 48 },
      {
        key: 'align',
        label: 'Perataan Teks',
        kind: 'select',
        options: [
          { value: 'left', label: 'Kiri' },
          { value: 'center', label: 'Tengah' },
          { value: 'right', label: 'Kanan' },
        ],
      },
      {
        key: 'full_width',
        label: 'Lebar Banner',
        kind: 'select',
        options: [
          { value: 'container', label: 'Normal (ikuti lebar konten)' },
          { value: 'full', label: 'Full lebar layar (kiri–kanan)' },
        ],
      },
    ],
  },
  {
    type: 'text',
    label: 'Teks',
    description: 'Judul & paragraf',
    icon: Type,
    defaults: {
      heading: 'Judul Bagian',
      body: 'Tulis paragraf di sini...',
      align: 'left',
    },
    props: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'body', label: 'Isi', kind: 'textarea' },
    ],
    style: [
      { key: 'align', label: 'Perataan Teks', kind: 'select', options: [
        { value: 'left', label: 'Kiri' },
        { value: 'center', label: 'Tengah' },
        { value: 'right', label: 'Kanan' },
      ] },
    ],
  },
  {
    type: 'products',
    label: 'Produk Unggulan',
    description: 'Grid produk dari katalog toko',
    icon: ShoppingBag,
    defaults: {
      heading: 'Produk Kami',
      limit: 8,
    },
    props: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'limit', label: 'Jumlah Produk', kind: 'number', min: 1, max: 24 },
    ],
    style: [],
  },
  {
    type: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Banner ajakan dengan tombol',
    icon: MousePointerClick,
    defaults: {
      heading: 'Siap Belanja?',
      body: 'Lihat katalog produk kami.',
      button_text: 'Lihat Produk',
      button_link: '#products',
      bg_color: '#4f46e5',
      text_color: '#ffffff',
    },
    props: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'body', label: 'Isi', kind: 'textarea' },
      { key: 'button_text', label: 'Teks Tombol', kind: 'text' },
      { key: 'button_link', label: 'Link Tombol', kind: 'text' },
    ],
    style: [
      { key: 'bg_color', label: 'Warna Latar', kind: 'color' },
      { key: 'text_color', label: 'Warna Teks', kind: 'color' },
    ],
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Daftar pertanyaan umum',
    icon: HelpCircle,
    defaults: {
      heading: 'Pertanyaan Umum',
      items: [{ q: 'Pertanyaan?', a: 'Jawaban.' }],
    },
    props: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      {
        key: 'items',
        label: 'Daftar FAQ',
        kind: 'repeater',
        itemLabel: 'FAQ',
        item: [
          { key: 'q', label: 'Pertanyaan', kind: 'text' },
          { key: 'a', label: 'Jawaban', kind: 'textarea' },
        ],
      },
    ],
    style: [],
  },
  {
    type: 'custom',
    label: 'HTML / CSS / JS Kustom',
    description: 'Tulis HTML, CSS & JavaScript sendiri — tampilan bebas (power user)',
    icon: Code2,
    defaults: {
      html: '<div class="custom-box">\n  <h2>Section Kustom</h2>\n  <p>Tulis HTML apa pun di sini.</p>\n</div>',
      css: '.custom-box { padding: 40px 24px; text-align: center; border-radius: 16px; background: #f8fafc; }\n.custom-box h2 { color: #1e293b; }',
      js: '// console.log("custom block loaded");',
    },
    props: [
      { key: 'html', label: 'HTML', kind: 'code', placeholder: '<div>...</div>' },
      { key: 'css', label: 'CSS (scoped)', kind: 'code', placeholder: '.class { ... }' },
      { key: 'js', label: 'JavaScript', kind: 'code', placeholder: '// jalankan saat blok tampil' },
    ],
    style: [],
  },
  {
    type: 'image',
    label: 'Gambar',
    description: 'Gambar tunggal dengan opsi rasio & efek',
    icon: ImageIcon,
    defaults: {
      image_url: '',
      alt: '',
      radius: 16,
      max_width: '100%',
    },
    props: [
      { key: 'image_url', label: 'URL Gambar', kind: 'image', placeholder: 'https://...' },
      { key: 'alt', label: 'Teks Alternatif', kind: 'text' },
      { key: 'link_url', label: 'Link (opsional)', kind: 'url', placeholder: 'https://...' },
    ],
    style: [
      { key: 'radius', label: 'Radius Sudut', kind: 'number', min: 0, max: 64 },
      { key: 'max_width', label: 'Lebar Maks (px / %)', kind: 'text', placeholder: '100%' },
      { key: 'align', label: 'Perataan', kind: 'select', options: [
        { value: 'left', label: 'Kiri' },
        { value: 'center', label: 'Tengah' },
        { value: 'right', label: 'Kanan' },
      ] },
    ],
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed video (YouTube / MP4)',
    icon: PlayCircle,
    defaults: {
      video_url: '',
      aspect: '16/9',
    },
    props: [
      { key: 'video_url', label: 'URL Video (YouTube / MP4)', kind: 'url', placeholder: 'https://youtube.com/...' },
    ],
    style: [
      { key: 'aspect', label: 'Rasio', kind: 'select', options: [
        { value: '16/9', label: '16:9' },
        { value: '4/3', label: '4:3' },
        { value: '1/1', label: '1:1' },
      ] },
      { key: 'radius', label: 'Radius Sudut', kind: 'number', min: 0, max: 64 },
    ],
  },
  {
    type: 'divider',
    label: 'Pembatas (Divider)',
    description: 'Garis pemisah antar bagian',
    icon: Minus,
    defaults: {
      height: 1,
    },
    props: [],
    style: [
      { key: 'height', label: 'Ketebalan', kind: 'number', min: 1, max: 12 },
      { key: 'color', label: 'Warna Garis', kind: 'color' },
      { key: 'margin', label: 'Margin (atas/bawah)', kind: 'text', placeholder: '24px 0' },
    ],
  },
  {
    type: 'footer',
    label: 'Footer Toko',
    description: 'Kaki halaman: tentang, menu, kontak, sosial',
    icon: PanelBottom,
    defaults: {
      about_text: 'Belanja mudah, antar cepat, pembayaran fleksibel. Pesan langsung dari toko online kami.',
      copyright: '',
      nav: [
        { label: 'Beranda', href: '/' },
        { label: 'Produk', href: '/#produk' },
      ],
      socials: [],
    },
    props: [
      { key: 'about_text', label: 'Teks Tentang', kind: 'textarea', placeholder: 'Deskripsi singkat toko' },
      { key: 'copyright', label: 'Teks Hak Cipta (kosong = otomatis)', kind: 'text', placeholder: '© 2025 Toko Anda' },
      {
        key: 'nav',
        label: 'Menu Footer',
        kind: 'repeater',
        itemLabel: 'Menu',
        item: [
          { key: 'label', label: 'Teks', kind: 'text' },
          { key: 'href', label: 'Link', kind: 'text' },
        ],
      },
      {
        key: 'socials',
        label: 'Sosial Media',
        kind: 'repeater',
        itemLabel: 'Sosial',
        item: [
          { key: 'label', label: 'Nama', kind: 'text' },
          { key: 'url', label: 'URL', kind: 'text' },
        ],
      },
    ],
    style: [
      { key: 'bg_color', label: 'Warna Latar Footer', kind: 'color' },
      { key: 'text_color', label: 'Warna Teks', kind: 'color' },
      { key: 'padding', label: 'Padding', kind: 'text', placeholder: '48px 24px 24px' },
    ],
  },
];

export const DEF_MAP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((d) => [d.type, d])
);

export const DEF_BY_TYPE = DEF_MAP;

/** Default style per tipe blok. */
const DEFAULT_STYLE: Record<string, BlockStyle> = {
  header: { bg_color: '', text_color: '', padding: '0 24px' },
  hero: { bg_color: '#1e293b', text_color: '#ffffff', padding: '64px 24px', radius: 16, align: 'center' },
  text: { align: 'left' },
  products: {},
  cta: { bg_color: '#4f46e5', text_color: '#ffffff' },
  faq: {},
  custom: {},
  image: { align: 'center' },
  video: {},
  divider: { color: '#e2e8f0', margin: '24px 0' },
  footer: { bg_color: '', text_color: '', padding: '48px 24px 24px' },
};

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Alias field blok lama (flat) → skema baru. Key = field baru, value = field lama. */
const LEGACY_ALIASES: Record<string, Record<string, string>> = {
  hero: { heading: 'title', subheading: 'subtitle', cta_text: 'button_text', cta_link: 'button_link', image_url: 'image' },
  text: { body: 'content' },
  cta: {},
  products: {},
  faq: {},
};

/**
 * Normalisasi blok lama (flat: {type, heading, ...}) → struktural
 * ({type, props, style}). Backward compatible dengan data cupelis yang ada.
 */
export function normalizeBlock(raw: unknown, idx: number): StructuralBlock {
  const b = (raw ?? {}) as Record<string, unknown>;
  const type = (String(b.type ?? 'text') in DEF_MAP ? String(b.type) : 'text') as BlockType;
  const def = DEF_MAP[type];
  const aliases = LEGACY_ALIASES[type] ?? {};

  const props: Record<string, unknown> = {};
  // Ambil konten dari b.props bila sudah struktural, atau dari flat keys.
  const source = (b.props && typeof b.props === 'object' ? b.props : b) as Record<string, unknown>;
  for (const f of def.props) {
    let v = source[f.key];
    if (v === undefined && aliases[f.key]) v = source[aliases[f.key]];
    props[f.key] = v !== undefined ? v : deepClone(f.default ?? def.defaults[f.key]);
  }

  const style: BlockStyle = { ...(DEFAULT_STYLE[type] ?? {}) };
  const styleSource = (b.style && typeof b.style === 'object' ? b.style : b) as Record<string, unknown>;
  for (const f of def.style ?? []) {
    const v = styleSource[f.key];
    if (v !== undefined && v !== null && v !== '') {
      (style as Record<string, unknown>)[f.key] = v;
    }
  }

  return { id: String(b.id ?? `blk_${idx}`), type, props, style, layout: {} };
}

/** Normalisasi array blok. */
export function normalizeBlocks(raw: unknown[] | null | undefined): StructuralBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeBlock);
}

/**
 * Ubah blok struktural → JSON yang disimpan ke DB.
 * Hanya menyimpan props/style yang bukan default (hemat storage, rapi).
 */
export function serializeBlock(block: StructuralBlock): Record<string, unknown> {
  const def = DEF_MAP[block.type];
  const out: Record<string, unknown> = { id: block.id, type: block.type };

  const props: Record<string, unknown> = {};
  for (const f of def.props) {
    const v = block.props[f.key];
    const isDefault = JSON.stringify(v) === JSON.stringify(deepClone(f.default ?? def.defaults[f.key]));
    if (!isDefault) props[f.key] = v;
  }
  if (Object.keys(props).length > 0) out.props = props;

  const style: Record<string, unknown> = {};
  for (const f of def.style ?? []) {
    const v = (block.style as Record<string, unknown>)[f.key];
    const isDefault = JSON.stringify(v) === JSON.stringify(DEFAULT_STYLE[block.type]?.[f.key as keyof BlockStyle]);
    if (v !== undefined && v !== null && v !== '' && !isDefault) style[f.key] = v;
  }
  if (Object.keys(style).length > 0) out.style = style;

  return out;
}

/** Serialisasi array blok → siap simpan ke DB. */
export function serializeBlocks(blocks: StructuralBlock[]): Record<string, unknown>[] {
  return blocks.map(serializeBlock);
}

/** Buat blok default (dipakai untuk mengisi halaman baru / kerangka). */
export function makeDefaultBlock(type: BlockType, index = 0): StructuralBlock {
  const def = DEF_MAP[type];
  const props: Record<string, unknown> = {};
  for (const f of def.props) props[f.key] = deepClone(f.default ?? def.defaults[f.key]);
  const style: BlockStyle = { ...(DEFAULT_STYLE[type] ?? {}) };
  return { id: `blk_${Date.now()}_${index}`, type, props, style, layout: {} };
}

/**
 * Kerangka default satu halaman (konsep Shopify: lahir sudah lengkap).
 * Header + Footer ikut di daftar blok sehingga bisa diedit/dipindah/hapus.
 */
export function defaultPageBlocks(): StructuralBlock[] {
  const make = (type: BlockType, seed: number) => {
    const def = DEF_MAP[type];
    const props: Record<string, unknown> = {};
    for (const f of def.props) props[f.key] = deepClone(f.default ?? def.defaults[f.key]);
    return { id: `${type}_${seed}`, type, props, style: { ...(DEFAULT_STYLE[type] ?? {}) }, layout: {} };
  };
  const t = Date.now();
  return [
    make('header', t),
    make('hero', t + 1),
    make('text', t + 2),
    make('products', t + 3),
    make('cta', t + 4),
    make('footer', t + 5),
  ];
}

/**
 * Pastikan halaman punya "cangkang" (header & footer) sebagai blok.
 * Kalau halaman lama belum punya, editor tetap menampilkan header/footer
 * default di atas/bawah daftar — disimpan saat owner klik Simpan.
 */
export function ensurePageShell(blocks: StructuralBlock[]): StructuralBlock[] {
  // Halaman benar-benar kosong → isi kerangka default lengkap (Shopify-like).
  if (blocks.length === 0) return defaultPageBlocks();
  const hasHeader = blocks.some((b) => b.type === 'header');
  const hasFooter = blocks.some((b) => b.type === 'footer');
  if (hasHeader && hasFooter) return blocks;
  const shell: StructuralBlock[] = [];
  if (!hasHeader) {
    const def = DEF_MAP.header;
    const props: Record<string, unknown> = {};
    for (const f of def.props) props[f.key] = deepClone(f.default ?? def.defaults[f.key]);
    shell.push({ id: 'header_default', type: 'header', props, style: { ...DEFAULT_STYLE.header }, layout: {} });
  }
  const out = [...shell, ...blocks];
  if (!hasFooter) {
    const def = DEF_MAP.footer;
    const props: Record<string, unknown> = {};
    for (const f of def.props) props[f.key] = deepClone(f.default ?? def.defaults[f.key]);
    out.push({ id: 'footer_default', type: 'footer', props, style: { ...DEFAULT_STYLE.footer }, layout: {} });
  }
  return out;
}
