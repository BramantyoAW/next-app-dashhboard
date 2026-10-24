import { gqlFetch } from '@/lib/graphqlClient';

const MY_STORES = `
query {
  myStores {
    id
    name
    image
    description
    phone
    address
    role
    product_count
    stock_total
    latitude
    longitude
    radius_km
    is_open
    created_at
    updated_at
  }
}
`;

export type MyStore = {
  id: number;
  name: string;
  image?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  product_count?: number;
  stock_total?: number;
  /** Titik outlet di peta. Null = merchant belum memetakan outlet ini. */
  latitude?: number | null;
  longitude?: number | null;
  /** Radius layanan (km) untuk pengiriman instan. */
  radius_km?: number | null;
  is_open?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type MyStoresResponse = { myStores: MyStore[] };

export async function myStoresService(token: string) {
  return gqlFetch<MyStoresResponse>(MY_STORES, {}, token);
}
