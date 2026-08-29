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
    points
    role
    product_count
    stock_total
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
  points?: number;
  role?: string | null;
  product_count?: number;
  stock_total?: number;
  created_at?: string;
  updated_at?: string;
};

export type MyStoresResponse = { myStores: MyStore[] };

export async function myStoresService(token: string) {
  return gqlFetch<MyStoresResponse>(MY_STORES, {}, token);
}
