import { gql } from "graphql-request";
import { graphqlClient } from "@/graphql/graphqlClient";

export const DELETE_MEMBER_STORE = gql`
  mutation deleteMemberStore($user_id: ID!, $store_id: ID!) {
    deleteMemberStore(user_id: $user_id, store_id: $store_id)
  }
`;

export async function deleteMemberStore(token: string, user_id: number, store_id: number) {
  return await graphqlClient.request(
    DELETE_MEMBER_STORE,
    { user_id, store_id },
    { Authorization: `Bearer ${token}` }
  );
}
