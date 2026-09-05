'use client';

import { createContext, useContext } from 'react';

/**
 * Data dinamis storefront yang disuntikkan ke kanvas Puck saat halaman dinamis
 * dirender (PDP, cart, checkout, kategori, ...). Komponen blok khusus
 * (mis. ProductSlotView) membaca context ini untuk menampilkan data AKTIF —
 * sementara teks/layout statis di sekitarnya berasal dari blok Puck.
 *
 * Contoh: PDP dibuka utk SKU tertentu → route fetch produk & template halaman
 * (slug 'product') → render StorefrontPuckRenderer dengan dynamic.product.
 */
export type PuckDynamic = {
  hash?: string;
  storeName?: string;
  product?: Record<string, any> | null;
  products?: Record<string, any>[] | null;
  cart?: Record<string, any>[] | null;
  categorySlug?: string;
  categoryName?: string;
};

export const PuckDynamicContext = createContext<PuckDynamic>({});
export const usePuckDynamic = () => useContext(PuckDynamicContext);
