import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_ALL_STORES = `
  query GetAllStores($limit: Int) {
    getAllStores(limit: $limit) {
      data {
        id
        name
        points
        image
        created_at
        updated_at
      }
      pagination {
        total
        count
        per_page
        current_page
        total_pages
      }
    }
  }
`;

export async function adminGetAllStoresService(token: string, limit = 10) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(GET_ALL_STORES, { limit });
}
