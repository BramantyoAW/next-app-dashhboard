import { gql } from "graphql-request";
import { graphqlClient } from "@/graphql/graphqlClient";

export const CREATE_MEMBER_STORE = gql`
  mutation createMemberStore(
    $store_id: ID!
    $role: String!
    $input: NewStoreUserInput!
  ) {
    createMemberStore(store_id: $store_id, role: $role, input: $input) {
      user {
        id
        username
        full_name
        email
      }
      role
    }
  }
`;

export async function createMemberStore(
  token: string,
  storeId: number,
  role: string,
  input: {
    username: string;
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }
) {
  return await graphqlClient.request(
    CREATE_MEMBER_STORE,
    { store_id: storeId, role, input },
    { Authorization: `Bearer ${token}` }
  );
}
