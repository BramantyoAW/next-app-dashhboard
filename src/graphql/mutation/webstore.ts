import { gqlFetch } from '@/lib/graphqlClient';

export const UPSERT_WEB_STORE = `
  mutation UpsertWebStore($input: UpsertWebStoreInput!) {
    upsertWebStore(input: $input) {
      id owner_id store_id slug subdomain_hash store_name theme_color tagline is_active
      logo_url banner_url custom_domain storefront_url
      payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
      shipping_methods { id name cost per_km min_cost min_order enabled }
      notify_whatsapp notify_telegram
    }
  }
`;

export const UPSERT_WEB_PAGE = `
  mutation UpsertWebPage($input: UpsertWebPageInput!) {
    upsertWebPage(input: $input) {
      id web_store_id slug title blocks is_published
    }
  }
`;

export const DELETE_WEB_PAGE = `
  mutation DeleteWebPage($input: DeleteWebPageInput!) {
    deleteWebPage(input: $input)
  }
`;

export const UPSERT_MASTER_PRODUCT = `
  mutation UpsertMasterProduct($input: UpsertMasterProductInput!) {
    upsertMasterProduct(input: $input) { id sku name description price image attributes is_active default_store_id }
  }
`;

export const DELETE_MASTER_PRODUCT = `
  mutation DeleteMasterProduct($id: ID!) {
    deleteMasterProduct(id: $id)
  }
`;

export const ASSIGN_PRODUCT_TO_STORE = `
  mutation AssignProductToStore($input: AssignProductInput!) {
    assignProductToStore(input: $input) {
      id store_id master_product_id price_override is_active
    }
  }
`;

export const UPDATE_STORE_PRODUCT = `
  mutation UpdateStoreProduct($input: UpdateStoreProductInput!) {
    updateStoreProduct(input: $input) {
      id price_override is_active
    }
  }
`;

export const CREATE_PRODUCT_CATEGORY = `
  mutation CreateProductCategory($input: CreateProductCategoryInput!) {
    createProductCategory(input: $input) {
      id web_store_id name slug sort_order is_active created_at updated_at
    }
  }
`;

export const UPDATE_PRODUCT_CATEGORY = `
  mutation UpdateProductCategory($input: UpdateProductCategoryInput!) {
    updateProductCategory(input: $input) {
      id web_store_id name slug sort_order is_active created_at updated_at
    }
  }
`;

export const DELETE_PRODUCT_CATEGORY = `
  mutation DeleteProductCategory($id: ID!) {
    deleteProductCategory(id: $id)
  }
`;

export const ASSIGN_PRODUCT_CATEGORIES = `
  mutation AssignProductCategories($store_product_id: ID!, $category_ids: [ID!]!) {
    assignProductCategories(store_product_id: $store_product_id, category_ids: $category_ids) {
      id store_id is_active
    }
  }
`;

export const UPDATE_STORE_PRODUCT_ATTRIBUTES = `
  mutation UpdateStoreProductAttributes($id: ID!, $attributes: JSON) {
    updateStoreProductAttributes(id: $id, attributes: $attributes) {
      id attributes
    }
  }
`;

export type UpsertWebStoreInput = {
  store_id: string;
  slug?: string | null;
  subdomain_hash?: string | null;
  store_name: string;
  theme_color?: string | null;
  tagline?: string | null;
  is_active?: boolean | null;
  settings?: Record<string, any> | null;
  payment_methods?: {
    id?: string | null;
    type: string;
    name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    account_name?: string | null;
    instructions?: string | null;
    is_free?: boolean | null;
    enabled?: boolean | null;
  }[];
  custom_domain?: string | null;
  notify_whatsapp?: string | null;
  notify_telegram?: string | null;
};

export function upsertWebStore(token: string, input: UpsertWebStoreInput) {
  return gqlFetch<{ upsertWebStore: any }>(UPSERT_WEB_STORE, { input }, token);
}

export function upsertMasterProduct(
  token: string,
  input: { id?: string | null; sku?: string | null; name: string; description?: string | null; price?: number | null; image?: string | null; attributes?: { name: string; value: string }[] | null; is_active?: boolean | null; default_store_id?: string | null }
) {
  return gqlFetch<{ upsertMasterProduct: any }>(UPSERT_MASTER_PRODUCT, { input }, token);
}

export function deleteMasterProduct(token: string, id: string) {
  return gqlFetch<{ deleteMasterProduct: boolean }>(DELETE_MASTER_PRODUCT, { id }, token);
}

export function upsertWebPage(
  token: string,
  input: { id?: string | null; slug?: string; title?: string; blocks?: unknown[] | null; is_published?: boolean }
) {
  return gqlFetch<{ upsertWebPage: any }>(UPSERT_WEB_PAGE, { input }, token);
}

export function deleteWebPage(token: string, input: { id: string }) {
  return gqlFetch<{ deleteWebPage: boolean }>(DELETE_WEB_PAGE, { input }, token);
}

export function assignProductToStore(
  token: string,
  input: { store_id: string; master_product_id: string; price_override?: number | null; is_active?: boolean | null }
) {
  return gqlFetch<{ assignProductToStore: any }>(ASSIGN_PRODUCT_TO_STORE, { input }, token);
}

export function updateStoreProduct(
  token: string,
  input: { id: string; price_override?: number | null; is_active?: boolean | null }
) {
  return gqlFetch<{ updateStoreProduct: any }>(UPDATE_STORE_PRODUCT, { input }, token);
}

export function updateStoreProductAttributes(
  token: string,
  id: string,
  attributes: { name: string; value: string }[]
) {
  return gqlFetch<{ updateStoreProductAttributes: any }>(
    UPDATE_STORE_PRODUCT_ATTRIBUTES,
    { id, attributes },
    token
  );
}

export const ADJUST_PRODUCT_VARIANT_STOCK = `
  mutation AdjustProductVariantStock($master_product_id: ID!, $store_id: ID!, $variant_key: String!, $change: Int!, $source: String, $note: String) {
    adjustProductVariantStock(master_product_id: $master_product_id, store_id: $store_id, variant_key: $variant_key, change: $change, source: $source, note: $note) {
      id master_product_id store_id variant_key qty
      logs { id change source note created_at }
    }
  }
`;

export function adjustProductVariantStock(
  token: string,
  input: { master_product_id: string; store_id: string; variant_key: string; change: number; source?: string | null; note?: string | null }
) {
  return gqlFetch<{ adjustProductVariantStock: any }>(
    ADJUST_PRODUCT_VARIANT_STOCK,
    input,
    token
  );
}

export type CreateProductCategoryInput = {
  web_store_id?: string | null;
  name: string;
  slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type UpdateProductCategoryInput = {
  id: string;
  name?: string | null;
  slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export function createProductCategory(token: string, input: CreateProductCategoryInput) {
  return gqlFetch<{ createProductCategory: any }>(CREATE_PRODUCT_CATEGORY, { input }, token);
}

export function updateProductCategory(token: string, input: UpdateProductCategoryInput) {
  return gqlFetch<{ updateProductCategory: any }>(UPDATE_PRODUCT_CATEGORY, { input }, token);
}

export function deleteProductCategory(token: string, id: string) {
  return gqlFetch<{ deleteProductCategory: boolean }>(DELETE_PRODUCT_CATEGORY, { id }, token);
}

/**
 * Sinkronkan kategori yang ter-assign pada sebuah produk store
 * (pivot `product_category_store_product`). `category_ids` = set lengkap
 * (replacement), list lawas akan dihapus.
 */
export function assignProductCategories(token: string, storeProductId: string, categoryIds: string[]) {
  return gqlFetch<{ assignProductCategories: any }>(
    ASSIGN_PRODUCT_CATEGORIES,
    { store_product_id: storeProductId, category_ids: categoryIds },
    token
  );
}

export const UPLOAD_PRODUCT_IMAGE = `
  mutation UploadProductImage($file: Upload!) {
    uploadProductImage(file: $file)
  }
`;

export function uploadProductImage(token: string, file: File | Blob) {
  return gqlFetch<{ uploadProductImage: string }>(UPLOAD_PRODUCT_IMAGE, { file }, token);
}

export const UPLOAD_WEB_STORE_MEDIA = `
  mutation UploadWebStoreMedia($collection: String!, $file: Upload!) {
    uploadWebStoreMedia(collection: $collection, file: $file) {
      id logo_url banner_url
    }
  }
`;

export function uploadWebStoreMedia(token: string, collection: 'logo' | 'banner', file: File) {
  return gqlFetch<{ uploadWebStoreMedia: { id: string; logo_url: string | null; banner_url: string | null } }>(
    UPLOAD_WEB_STORE_MEDIA,
    { collection, file },
    token
  );
}

export const UPSERT_COUPON = `
  mutation UpsertCoupon($input: UpsertCouponInput!) {
    upsertCoupon(input: $input) {
      id code type value max_discount min_order usage_limit used_count starts_at expires_at is_active
    }
  }
`;

export const DELETE_COUPON = `
  mutation DeleteCoupon($web_store_id: ID!, $coupon_id: String!) {
    deleteCoupon(web_store_id: $web_store_id, coupon_id: $coupon_id) {
      id code type value max_discount min_order usage_limit used_count starts_at expires_at is_active
    }
  }
`;

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

export type CouponInput = {
  id?: string | null;
  code: string;
  type: string;
  value: number;
  max_discount?: number | null;
  min_order?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
};

export function upsertCoupon(token: string, web_store_id: string, coupon: CouponInput) {
  return gqlFetch<{ upsertCoupon: Coupon[] }>(UPSERT_COUPON, { input: { web_store_id, coupon } }, token);
}

export function deleteCoupon(token: string, web_store_id: string, coupon_id: string) {
  return gqlFetch<{ deleteCoupon: Coupon[] }>(DELETE_COUPON, { web_store_id, coupon_id }, token);
}
