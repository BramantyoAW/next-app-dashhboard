/**
 * Tiny client-side cart store. No zustand/redux — the cart is small,
 * lives only on the storefront, and survives reload via localStorage.
 * Keyed by web-store hash so multi-tenant browsers don't collide.
 */
export type CartItem = {
  store_product_id: string;
  sku: string;
  name: string;
  price: number;
  image: string | null;
  qty: number;
  /** Nama varian terpilih (tampil/catatan order), mis. "Ukuran L, Warna Merah". Opsional. */
  variant?: string;
  /** Kunci kanonikal varian utk checkout & stok, mis. "Ukuran:250g|Kemasan:Biji". Opsional. */
  variant_key?: string;
};

const key = (hash: string) => `storefront_cart_${hash}`;

export function loadCart(hash: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key(hash)) ?? '[]');
  } catch {
    return [];
  }
}

export function saveCart(hash: string, items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(hash), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('storefront-cart-change'));
}

export function addToCart(hash: string, item: Omit<CartItem, 'qty'>, qty = 1): CartItem[] {
  const items = loadCart(hash);
  const existing = items.find((i) =>
    i.store_product_id === item.store_product_id && (i.variant_key ?? '') === (item.variant_key ?? ''),
  );
  if (existing) existing.qty += qty;
  else items.push({ ...item, qty });
  saveCart(hash, items);
  return items;
}

export function setQty(hash: string, id: string, qty: number): CartItem[] {
  const items = loadCart(hash).map((i) =>
    i.store_product_id === id ? { ...i, qty: Math.max(1, qty) } : i,
  );
  saveCart(hash, items);
  return items;
}

export function removeFromCart(hash: string, id: string): CartItem[] {
  const items = loadCart(hash).filter((i) => i.store_product_id !== id);
  saveCart(hash, items);
  return items;
}

export function clearCart(hash: string): void {
  saveCart(hash, []);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function formatIDR(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}
