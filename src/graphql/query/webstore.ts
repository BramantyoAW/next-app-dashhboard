import { gqlFetch } from '@/lib/graphqlClient';

export const WEBSTORE_BY_HASH = `
  query WebStoreByHash($hash: String!) {
    webStoreByHash(hash: $hash) {
      id owner_id store_id slug subdomain_hash store_name theme_color tagline is_active
      logo_url banner_url custom_domain storefront_url
      payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
      shipping_methods { id name cost per_km min_cost min_order enabled }
      notify_whatsapp notify_telegram
      store { id name }
      pages { id slug title blocks is_published }
    }
  }
`;

export const WEBSTORE_BY_SLUG = `
  query WebStoreBySlug($slug: String!) {
    webStoreBySlug(slug: $slug) {
      id owner_id store_id slug subdomain_hash store_name theme_color tagline is_active
      logo_url banner_url custom_domain storefront_url
      payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
      shipping_methods { id name cost per_km min_cost min_order enabled }
      notify_whatsapp notify_telegram
      store { id name }
      pages { id slug title blocks is_published }
    }
  }
`;

export const WEBSTORE_BY_OWNER = `
  query WebStoreByOwner($owner_id: ID!) {
    webStoreByOwner(owner_id: $owner_id) {
      id owner_id store_id slug subdomain_hash store_name theme_color tagline is_active
      logo_url banner_url custom_domain storefront_url
      payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
      shipping_methods { id name cost per_km min_cost min_order enabled }
      notify_whatsapp notify_telegram
      settings
      store { id name }
      pages { id slug title blocks is_published }
    }
  }
`;

export const ESTIMATE_SHIPPING = `
  query EstimateShipping($web_store_slug: String!, $lat: Float, $lng: Float, $items: [WebOrderItemInput!]!, $subtotal: Float!) {
    estimateShipping(web_store_slug: $web_store_slug, lat: $lat, lng: $lng, items: $items, subtotal: $subtotal) {
      method { id name cost per_km min_cost min_order enabled }
      cost
      distance_km
      available
    }
  }
`;

export const WEB_STORE_CATEGORIES = `
  query WebStoreCategories($web_store_id: ID!) {
    webStoreCategories(web_store_id: $web_store_id) {
      id web_store_id name slug sort_order is_active created_at updated_at
      store_products { id }
    }
  }
`;

export const STOREFRONT_CATEGORIES = `
  query StorefrontCategories($web_store_slug: String!) {
    storefrontCategories(web_store_slug: $web_store_slug) {
      id name slug sort_order is_active
    }
  }
`;

export const STOREFRONT_PRODUCTS_BY_CATEGORY = `
  query StorefrontProductsByCategory($web_store_slug: String!, $category_slug: String!, $page: Int, $limit: Int) {
    storefrontProductsByCategory(web_store_slug: $web_store_slug, category_slug: $category_slug, page: $page, limit: $limit) {
      id price_override image is_active
      master_product { id sku name description price image }
    }
  }
`;

export const VALIDATE_COUPON = `
  query ValidateCoupon($web_store_slug: String!, $code: String!, $subtotal: Float!) {
    validateCoupon(web_store_slug: $web_store_slug, code: $code, subtotal: $subtotal) {
      valid
      discount
      error
      coupon {
        id code type value max_discount min_order usage_limit used_count starts_at expires_at is_active
      }
    }
  }
`;

export const MASTER_PRODUCTS = `
  query MasterProducts($search: String, $min_price: Float, $max_price: Float, $store_id: ID, $page: Int, $limit: Int) {
    masterProducts(search: $search, min_price: $min_price, max_price: $max_price, store_id: $store_id, page: $page, limit: $limit) {
      data {
        id sku name description price image default_store_id attributes is_active
        store_products { id store_id price_override is_active store { id name } }
      }
      current_page last_page total per_page
    }
  }
`;

export const MERCHANT_STORE_PRODUCTS = `
  query MerchantStoreProducts($store_id: ID!, $page: Int, $limit: Int) {
    merchantStoreProducts(store_id: $store_id, page: $page, limit: $limit) {
      data {
        id store_id master_product_id price_override image is_active attributes
        master_product { id sku name attributes }
        store { id name }
      }
      current_page last_page total per_page
    }
  }
`;

export type WebStore = {
  id: string;
  owner_id?: string | null;
  store_id: string;
  slug?: string | null;
  subdomain_hash?: string | null;
  store_name: string;
  theme_color?: string | null;
  tagline?: string | null;
  is_active: boolean;
  logo_url?: string | null;
  banner_url?: string | null;
  custom_domain?: string | null;
  storefront_url?: string | null;
  payment_methods?: PaymentMethodConfig[];
  shipping_methods?: ShippingMethod[];
  notify_whatsapp?: string | null;
  notify_telegram?: string | null;
  settings?: Record<string, any> | null;
  store?: { id: string; name: string } | null;
  pages?: WebPage[];
};

export type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  max_discount?: number | null;
  min_order?: number | null;
  usage_limit?: number | null;
  used_count: number;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
};

export type CouponValidation = {
  valid: boolean;
  discount: number;
  error?: string | null;
  coupon?: Coupon | null;
};

export type PageBlock = {
  id: string;
  type: string;
  [key: string]: unknown;
};

export type WebPage = {
  id: string;
  web_store_id?: string;
  slug: string;
  title: string;
  blocks: PageBlock[] | null;
  is_published: boolean;
};

export type PaymentMethodConfig = {
  id: string;
  type: string;
  name: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  instructions?: string | null;
  is_free: boolean;
  enabled: boolean;
};

/** One shipping (ongkir) method configured on the web store. */
export type ShippingMethod = {
  id: string;
  name: string;
  /** flat: fixed delivery cost */
  cost?: number | null;
  /** distance: per-km rate */
  per_km?: number | null;
  /** distance: minimum cost (floor) */
  min_cost?: number | null;
  /** free: subtotal threshold for free shipping */
  min_order?: number | null;
  enabled: boolean;
};

/** A shipping method's estimated cost for a given cart + destination. */
export type ShippingEstimate = {
  method: ShippingMethod | null;
  cost: number;
  distance_km: number;
  available: boolean;
};

export function estimateShipping(
  opts: { web_store_slug: string; lat?: number | null; lng?: number | null; items: { store_product_id: string; qty: number }[]; subtotal: number },
  token?: string,
) {
  return gqlFetch<{ estimateShipping: ShippingEstimate | null }>(
    ESTIMATE_SHIPPING,
    {
      web_store_slug: opts.web_store_slug,
      lat: opts.lat ?? null,
      lng: opts.lng ?? null,
      items: opts.items,
      subtotal: opts.subtotal,
    },
    token,
  );
}

export type MasterProduct = {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  attributes?: ProductAttribute[] | null;
  is_active?: boolean;
  default_store_id?: string | null;
  store_products?: Array<{ id: string; store_id: string; price_override?: number | null; is_active: boolean; store?: { id: string; name: string } | null }>;
};

export type ProductAttribute = {
  name: string;
  value: string;
};

export type StoreProduct = {
  id: string;
  store_id: string;
  master_product_id: string;
  price_override?: number | null;
  image?: string | null;
  is_active: boolean;
  /** Daftar varian produk, mis. [{ name: "Ukuran", value: "L" }, { name: "Warna", value: "Merah" }] */
  attributes?: ProductAttribute[] | null;
  master_product?: { id: string; sku?: string | null; name: string; attributes?: ProductAttribute[] | null } | null;
  store?: { id: string; name: string } | null;
};

export type ProductCategory = {
  id: string;
  web_store_id: string;
  name: string;
  slug?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  /** Produk yang ter-assign ke kategori ini (hanya `id` yang diminta). */
  store_products?: Array<{ id: string }>;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

export function getWebStoreByHash(hash: string, token: string) {
  return gqlFetch<{ webStoreByHash: WebStore | null }>(WEBSTORE_BY_HASH, { hash }, token);
}

export function getWebStoreByOwner(ownerId: string | number, token: string) {
  return gqlFetch<{ webStoreByOwner: WebStore | null }>(WEBSTORE_BY_OWNER, { owner_id: String(ownerId) }, token);
}

export function getWebStoreBySlug(slug: string, token: string) {
  return gqlFetch<{ webStoreBySlug: WebStore | null }>(WEBSTORE_BY_SLUG, { slug }, token);
}

export function listMasterProducts(token: string, opts: { search?: string; min_price?: number; max_price?: number; store_id?: string; page?: number; limit?: number } = {}) {
  return gqlFetch<{ masterProducts: Paginated<MasterProduct> }>(
    MASTER_PRODUCTS,
    {
      search: opts.search ?? null,
      min_price: opts.min_price ?? null,
      max_price: opts.max_price ?? null,
      store_id: opts.store_id ?? null,
      page: opts.page ?? 1,
      limit: opts.limit ?? 20,
    },
    token
  );
}

export function listStoreProducts(token: string, storeId: string, opts: { page?: number; limit?: number } = {}) {
  return gqlFetch<{ merchantStoreProducts: Paginated<StoreProduct> }>(
    MERCHANT_STORE_PRODUCTS,
    { store_id: storeId, page: opts.page ?? 1, limit: opts.limit ?? 50 },
    token
  );
}

export function listWebStoreCategories(token: string, webStoreId: string) {
  return gqlFetch<{ webStoreCategories: ProductCategory[] }>(WEB_STORE_CATEGORIES, { web_store_id: webStoreId }, token);
}

/** Query storefront (anon) — daftar kategori aktif dari web store publik. */
export function listStorefrontCategories(webStoreSlug: string) {
  return gqlFetch<{ storefrontCategories: ProductCategory[] }>(STOREFRONT_CATEGORIES, { web_store_slug: webStoreSlug });
}

export const PRODUCT_VARIANT_STOCKS = `
  query ProductVariantStocks($store_id: ID!, $master_product_id: ID) {
    productVariantStocks(store_id: $store_id, master_product_id: $master_product_id) {
      id master_product_id store_id variant_key image qty
      logs { id change source note created_at }
      master_product { id sku name }
    }
  }
`;

export type ProductVariantStock = {
  id: string;
  master_product_id: string;
  store_id: string;
  variant_key: string;
  image?: string | null;
  qty: number;
  logs?: Array<{ id: string; change: number; source?: string | null; note?: string | null; created_at: string }>;
  master_product?: { id: string; sku?: string | null; name: string } | null;
};

/** Query varian stok per outlet (owner, guarded). */
export function listProductVariantStocks(token: string, storeId: string, masterProductId?: string) {
  return gqlFetch<{ productVariantStocks: ProductVariantStock[] }>(
    PRODUCT_VARIANT_STOCKS,
    { store_id: storeId, master_product_id: masterProductId ?? null },
    token
  );
}

/** Query storefront (anon) — produk dari sebuah kategori. */
export function listStorefrontProductsByCategory(
  webStoreSlug: string,
  categorySlug: string,
  opts: { page?: number; limit?: number } = {}
) {
  return gqlFetch<{ storefrontProductsByCategory: StoreProduct[] }>(
    STOREFRONT_PRODUCTS_BY_CATEGORY,
    { web_store_slug: webStoreSlug, category_slug: categorySlug, page: opts.page ?? 1, limit: opts.limit ?? 50 },
  );
}

export function validateCoupon(hash: string, code: string, subtotal: number) {
  return gqlFetch<{ validateCoupon: CouponValidation }>(
    VALIDATE_COUPON,
    { web_store_slug: hash, code, subtotal }
  );
}
