import { gql } from 'graphql-request';
import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_USER_BY_STORE_ID = gql`
  query getUserByStoreId($store_id: Int!, $limit: Int, $page: Int) {
    getUserByStoreId(store_id: $store_id, limit: $limit, page: $page) {
      data {
        id
        username
        full_name
        email
        role
        phone
        created_at
      }
      meta {
        pagination {
          total
          count
          per_page
          current_page
          total_pages
        }
      }
    }
  }
`;


export async function getUserByStoreId(token: string, storeId: number, limit = 10, page = 1) {
  return await graphqlClient.request(
    GET_USER_BY_STORE_ID,
    { store_id: storeId, limit, page },
    { Authorization: `Bearer ${token}` }
  );
}
