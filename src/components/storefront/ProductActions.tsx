'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ProductAttribute } from '@/graphql/query/webstore';
import { AddToCartButton } from '@/components/storefront/AddToCartButton';
import { VariantPicker } from '@/components/storefront/VariantPicker';
import { formatIDR } from '@/lib/cart';
import type { CartItem } from '@/lib/cart';

type Props = {
  hash: string;
  itemProps: Omit<CartItem, 'qty' | 'variant' | 'variant_key'>;
  attributes: ProductAttribute[];
  /** Map variant_key → image (dari product_variant_stocks.image), utk tampilkan gambar varian terpilih. */
  variantImages?: Record<string, string>;
  /** Map variant_key → harga varian (product_variant_stocks.price). Harga tampil & item ikut varian terpilih. */
  variantPrices?: Record<string, number>;
};

export function ProductActions({ hash, itemProps, attributes, variantImages = {}, variantPrices = {} }: Props) {
  const [selection, setSelection] = useState<{ summary: string; variant_key: string }>({ summary: '', variant_key: '' });
  const [price, setPrice] = useState(itemProps.price);

  const handleVariantChange = (sel: { summary: string; variant_key: string }) => {
    setSelection(sel);
    const img = variantImages[sel.variant_key];
    if (img) {
      const root = document.querySelector<HTMLImageElement>('[data-variant-image-root]');
      if (root) root.src = img;
    }
    const vp = variantPrices[sel.variant_key];
    if (vp != null) {
      setPrice(vp);
      const priceRoot = document.querySelector<HTMLElement>('[data-variant-price-root]');
      if (priceRoot) priceRoot.textContent = formatIDR(vp);
    }
  };

  return (
    <div className="space-y-4">
      <VariantPicker attributes={attributes} onChange={handleVariantChange} />
      <div className="flex flex-wrap gap-2">
        <AddToCartButton
          hash={hash}
          item={{
            ...itemProps,
            price,
            ...(selection.variant_key
              ? { variant: selection.summary, variant_key: selection.variant_key }
              : {}),
          }}
        />
        <Link
          href={`/storefront/${hash}/cart?checkout=1`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Beli Sekarang
        </Link>
      </div>
    </div>
  );
}
