import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_TOTAL_USERS = `
  query {
    getAllUsers(limit: 1, page: 1) {
      meta {
        pagination {
          total
        }
      }
    }
  }
`;

export const GET_TOTAL_STORES = `
  query {
    getAllStores(limit: 1) {
      pagination {
        total
      }
    }
  }
`;

export async function adminGetTotalUsers(token: string) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(GET_TOTAL_USERS);
}

export async function adminGetTotalStores(token: string) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(GET_TOTAL_STORES);
}
