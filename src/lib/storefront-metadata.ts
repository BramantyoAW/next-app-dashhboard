import type { Metadata } from 'next';

/** Per-store SEO metadata (generic; derived from the web store record). */
export function storefrontMetadata(store: {
  store_name: string;
  tagline?: string | null;
}): Metadata {
  const title = store.store_name;
  const description =
    store.tagline ||
    `Belanja online di ${store.store_name} — produk berkualitas, antar cepat, pembayaran mudah.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}
