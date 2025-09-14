import { gqlFetch } from '@/lib/graphqlClient';

const MY_STORES = `
query {
  myStores {
    id
    name
    created_at
    updated_at
  }
}
`;

export type MyStore = { id: number; name: string };
export type MyStoresResponse = { myStores: MyStore[] };

export async function myStoresService(token: string) {
  return gqlFetch<MyStoresResponse>(MY_STORES, {}, token);
}
