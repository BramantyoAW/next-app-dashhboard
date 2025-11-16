import { gql } from "graphql-request";
import { graphqlClient } from "@/graphql/graphqlClient";

export const UPDATE_MEMBER_STORE = gql`
  mutation updateMemberStore(
    $user_id: ID!
    $store_id: ID!
    $role: String
    $input: UpdateStoreUserInput!
  ) {
    updateMemberStore(
      user_id: $user_id
      store_id: $store_id
      role: $role
      input: $input
    ) {
      user {
        id
        username
        full_name
        email
        phone
      }
      role
    }
  }
`;

export async function updateMemberStore(
  token: string,
  user_id: number,
  store_id: number,
  role: string | null,
  input: any
) {
  return await graphqlClient.request(
    UPDATE_MEMBER_STORE,
    { user_id, store_id, role, input },
    { Authorization: `Bearer ${token}` }
  );
}
