import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_ALL_USERS = `
  query GetAllUsers($limit: Int, $page: Int) {
    getAllUsers(limit: $limit, page: $page) {
      data {
        id
        username
        full_name
        email
        role
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

export async function adminGetAllUsersService(token: string, limit = 10, page = 1) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(GET_ALL_USERS, { limit, page });
}
