import { gqlFetch } from '@/lib/graphqlClient';

const CHOOSE_STORE = `
mutation ChooseStore($id: ID!) {
  chooseStore(store_id: $id) {
    access_token
    token_type
    expires_in
    user { id username full_name }
  }
}
`;

export type ChooseStoreResponse = {
  chooseStore: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: { id: number; username: string; full_name: string };
  };
};

export async function chooseStoreService(token: string, storeId: number) {
  return gqlFetch<ChooseStoreResponse>(CHOOSE_STORE, { id: storeId }, token);
}
