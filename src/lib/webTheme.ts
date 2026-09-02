/**
 * Tema global web store — disimpan di web_store.settings.theme (JSON).
 * Dipakai setup page (editor) & storefront (CSS variables).
 *
 * Struktur:
 * {
 *   font: 'system' | 'serif' | 'mono' | 'inter' | 'poppins' | 'playfair',
 *   colors: { brand, bg, text, muted },
 *   radius: number,        // border radius global (px)
 *   button: { radius, style },  // 'rounded' | 'square' | 'pill'
 *   custom_css: string,    // CSS kustom owner, di-inject <style>
 * }
 */
export type WebTheme = {
  font: string;
  colors: { brand: string; bg: string; text: string; muted: string };
  radius: number;
  buttonStyle: 'rounded' | 'square' | 'pill';
  custom_css: string;
  custom_js: string;
};

export const THEME_PRESETS: { name: string; theme: Omit<WebTheme, 'custom_css' | 'custom_js'> }[] = [
  {
    name: 'Modern (default)',
    theme: {
      font: 'system',
      colors: { brand: '#0ea5e9', bg: '#ffffff', text: '#0f172a', muted: '#64748b' },
      radius: 12,
      buttonStyle: 'rounded',
    },
  },
  {
    name: 'Elegan',
    theme: {
      font: 'serif',
      colors: { brand: '#b45309', bg: '#faf9f7', text: '#292524', muted: '#78716c' },
      radius: 4,
      buttonStyle: 'square',
    },
  },
  {
    name: 'Bold',
    theme: {
      font: 'system',
      colors: { brand: '#dc2626', bg: '#ffffff', text: '#111827', muted: '#6b7280' },
      radius: 0,
      buttonStyle: 'pill',
    },
  },
  {
    name: 'Fresh',
    theme: {
      font: 'system',
      colors: { brand: '#16a34a', bg: '#f0fdf4', text: '#14532d', muted: '#4b7a5a' },
      radius: 16,
      buttonStyle: 'rounded',
    },
  },
];

export const FONT_OPTIONS: { value: string; label: string; css: string }[] = [
  { value: 'system', label: 'System (default)', css: 'ui-sans-serif, system-ui, sans-serif' },
  { value: 'serif', label: 'Serif (klasik)', css: 'Georgia, "Times New Roman", serif' },
  { value: 'mono', label: 'Monospace', css: '"SF Mono", Menlo, monospace' },
  { value: 'inter', label: 'Inter (modern)', css: '"Inter", ui-sans-serif, sans-serif' },
  { value: 'poppins', label: 'Poppins (rounded)', css: '"Poppins", ui-sans-serif, sans-serif' },
  { value: 'playfair', label: 'Playfair (elegan)', css: '"Playfair Display", Georgia, serif' },
];

export function defaultTheme(): WebTheme {
  return {
    font: 'system',
    colors: { brand: '#0ea5e9', bg: '#ffffff', text: '#0f172a', muted: '#64748b' },
    radius: 12,
    buttonStyle: 'rounded',
    custom_css: '',
    custom_js: '',
  };
}

/**
 * Konfigurasi global Header & Footer (disimpan di web_store.settings.chrome).
 * Owner bisa atur lewat Setup — tanpa perlu sentuh blok per halaman.
 */
export type WebChrome = {
  header: {
    show_search: boolean;
    show_feature_strip: boolean;
    show_orders: boolean;
  };
  footer: {
    about_text: string;
    payments: string[];
    socials: { platform: string; url: string }[];
    show_powered_by: boolean;
    copyright_text: string;
  };
};

export function defaultChrome(): WebChrome {
  return {
    header: {
      show_search: true,
      show_feature_strip: true,
      show_orders: true,
    },
    footer: {
      about_text: 'Belanja mudah, antar cepat, pembayaran fleksibel. Pesan langsung dari toko online kami.',
      payments: ['BCA', 'QRIS', 'COD'],
      socials: [],
      show_powered_by: true,
      copyright_text: '',
    },
  };
}

/** Normalisasi chrome dari JSON (toleran nilai parsial). */
export function normalizeChrome(raw: unknown): WebChrome {
  const c = (raw ?? {}) as Partial<WebChrome>;
  const d = defaultChrome();
  return {
    header: {
      show_search: c.header?.show_search ?? d.header.show_search,
      show_feature_strip: c.header?.show_feature_strip ?? d.header.show_feature_strip,
      show_orders: c.header?.show_orders ?? d.header.show_orders,
    },
    footer: {
      about_text: c.footer?.about_text ?? d.footer.about_text,
      payments: Array.isArray(c.footer?.payments) && c.footer.payments.length > 0 ? c.footer.payments : d.footer.payments,
      socials: Array.isArray(c.footer?.socials) ? c.footer.socials : [],
      show_powered_by: c.footer?.show_powered_by ?? d.footer.show_powered_by,
      copyright_text: c.footer?.copyright_text ?? '',
    },
  };
}

/** Normalisasi theme dari JSON (toleran terhadap nilai parsial). */
export function normalizeTheme(raw: unknown): WebTheme {
  const t = (raw ?? {}) as Partial<WebTheme>;
  const d = defaultTheme();
  const colors = {
    ...d.colors,
    ...((t.colors ?? {}) as Partial<WebTheme['colors']>),
  };
  return {
    font: t.font ?? d.font,
    colors: {
      brand: colors.brand || d.colors.brand,
      bg: colors.bg || d.colors.bg,
      text: colors.text || d.colors.text,
      muted: colors.muted || d.colors.muted,
    },
    radius: typeof t.radius === 'number' ? t.radius : d.radius,
    buttonStyle: t.buttonStyle ?? d.buttonStyle,
    custom_css: t.custom_css ?? '',
    custom_js: (t as Record<string, unknown>).custom_js as string ?? '',
  };
}

/** Font CSS untuk @font-face/import (Google Fonts) — hanya jika pakai font eksternal. */
export function fontImport(theme: WebTheme): string | null {
  switch (theme.font) {
    case 'inter':
      return '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap");';
    case 'poppins':
      return '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap");';
    case 'playfair':
      return '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&display=swap");';
    default:
      return null;
  }
}

/** Konversi theme → string CSS (CSS variables + custom CSS). */
export function themeToCss(theme: WebTheme): string {
  const f = FONT_OPTIONS.find((o) => o.value === theme.font)?.css ?? 'ui-sans-serif, system-ui, sans-serif';
  const importCss = fontImport(theme);
  const radius =
    theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0px' : `${theme.radius}px`;
  return `${importCss ? importCss + '\n' : ''}:root {
  --brand: ${theme.colors.brand};
  --brand-contrast: #ffffff;
  --bg: ${theme.colors.bg};
  --text: ${theme.colors.text};
  --muted: ${theme.colors.muted};
  --font: ${f};
  --radius: ${theme.radius}px;
  --btn-radius: ${radius};
}
body, .storefront-root { font-family: var(--font); background: var(--bg); color: var(--text); }
${theme.custom_css || ''}`;
}

/** Sanitize custom JS for inline injection — strip dangerous patterns. */
export function sanitizeCustomJs(js: string): string {
  if (!js) return '';
  return js
    .replace(/<\/script/gi, '<\\/script')   // break out of script tag
    .replace(/document\.cookie/gi, '')       // no cookie access
    .replace(/localStorage/gi, '')           // no localStorage
    .replace(/sessionStorage/gi, '')         // no sessionStorage
    .replace(/fetch\(/gi, 'void(')           // no fetch
    .replace(/XMLHttpRequest/gi, 'void')     // no XHR
    .trim();
}
