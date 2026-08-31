import type { Metadata } from 'next';

/** Per-store SEO metadata (generic; derived from the web store record). */
export function storefrontMetadata(store: {
  store_name: string;
  tagline?: string | null;
  logo_url?: string | null;
}): Metadata {
  const title = store.store_name;
  const description =
    store.tagline ||
    `Belanja online di ${store.store_name} — produk berkualitas, antar cepat, pembayaran mudah.`;
  return {
    title,
    description,
    icons: store.logo_url
      ? { icon: [{ url: store.logo_url, type: 'image/png' }], shortcut: store.logo_url }
      : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      images: store.logo_url ? [{ url: store.logo_url, alt: store.store_name }] : undefined,
    },
  };
}
