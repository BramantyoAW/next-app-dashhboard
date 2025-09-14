import { gqlFetch } from '@/lib/graphqlClient';

const GET_STORE_BY_ID = `
query GetStoreById($id: ID!) {
  getStoreById(id: $id) {
    id
    name
    created_at
    updated_at
  }
}
`;

export type StoreDetail = { id: number; name: string };

export async function getStoreByIdService(token: string, id: number) {
  return gqlFetch<{ getStoreById: StoreDetail }>(GET_STORE_BY_ID, { id }, token);
}
