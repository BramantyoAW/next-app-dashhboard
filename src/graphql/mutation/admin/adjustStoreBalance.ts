import { gqlFetch } from '@/lib/graphqlClient';

const ADJUST_STORE_BALANCE = `
  mutation AdjustStoreBalance($store_id: ID!, $amount: Int!, $note: String!) {
    adjustStoreBalance(store_id: $store_id, amount: $amount, note: $note) {
      id
      points
    }
  }
`;

export async function adminAdjustStoreBalanceService(token: string, store_id: string, amount: number, note: string) {
  return gqlFetch<any>(ADJUST_STORE_BALANCE, { store_id, amount, note }, token);
}
