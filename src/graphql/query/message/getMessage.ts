import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export const GET_WA_MESSAGES = gql`
  query WaMessagesByStore($store_id: ID!, $page: Int, $limit: Int) {
    waMessagesByStore(store_id: $store_id, page: $page, limit: $limit) {
      data {
        id
        store_id
        user_id
        username
        text_whatsapp
        created_at
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

export async function getWaMessages(
  token: string,
  store_id: number,
  page: number = 1,
  limit: number = 10
) {
  return graphqlClient
    .setHeaders({
      Authorization: `Bearer ${token}`,
    })
    .request(GET_WA_MESSAGES, { store_id, page, limit });
}
