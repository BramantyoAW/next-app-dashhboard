import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_ALL_EMAIL_HISTORY = `
  query GetAllEmailHistory($limit: Int, $page: Int) {
    getAllEmailHistory(limit: $limit, page: $page) {
      data {
        id
        to
        subject
        body
        status
        error_message
        created_at
      }
      meta {
        pagination {
          total
          current_page
          total_pages
        }
      }
    }
  }
`;

export async function adminGetAllEmailHistory(token: string, limit: number = 10, page: number = 1) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request<any>(GET_ALL_EMAIL_HISTORY, { limit, page });
}
