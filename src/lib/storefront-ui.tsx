/**
 * Shared storefront helpers (generic — every merchant renders through these).
 * No hardcoded store names/URLs: everything derives from the web store record.
 */

/** Pick the display image for a store product (store override → master image → null). */
export function productImage(p: {
  image?: string | null;
  master_product?: { image?: string | null } | null;
}): string | null {
  return p.image ?? p.master_product?.image ?? null;
}

/** Pick the effective price (store price override → master price). */
export function productPrice(p: {
  price_override?: number | null;
  master_product?: { price?: number | null } | null;
}): number {
  return p.price_override ?? p.master_product?.price ?? 0;
}

/** WhatsApp link with prefilled message (generic; phone from store settings). */
export function waLink(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const full = digits.startsWith('62') ? digits : digits.startsWith('0') ? `62${digits.slice(1)}` : `62${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Lazy-load product grid: mobile-first 2 cols, up to 5 on xl. */
export const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

/** Consistent section heading (generic). */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{children}</h2>
      <span className="h-1 w-10 shrink-0 rounded-full" style={{ background: 'var(--brand, #111)' }} />
    </div>
  );
}

/** Simple stat used by feature strip / trust row. */
export type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  desc?: string;
};
