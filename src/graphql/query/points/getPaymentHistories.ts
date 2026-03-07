import { gqlFetch } from '@/lib/graphqlClient';

const GET_PAYMENT_HISTORIES = `
  query GetPaymentHistories($store_id: ID, $search: String, $page: Int, $limit: Int) {
    getPaymentHistories(store_id: $store_id, search: $search, page: $page, limit: $limit) {
      data {
        id
        store_id
        external_id
        amount
        status
        payload
        response
        created_at
        store {
          id
          name
          image
          description
        }
      }
      pagination {
        total
        current_page
        per_page
        total_pages
      }
    }
  }
`;

export async function adminGetPaymentHistoriesService(token: string, variables: any) {
  return gqlFetch<any>(GET_PAYMENT_HISTORIES, variables, token);
}
