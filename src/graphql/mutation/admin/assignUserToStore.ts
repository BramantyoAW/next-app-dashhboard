import { graphqlClient } from "@/graphql/graphqlClient";

export const ASSIGN_USER_TO_STORE = `
  mutation AssignUserToStore($user_id: ID!, $store_id: ID!, $role: String!) {
    assignUserToStore(user_id: $user_id, store_id: $store_id, role: $role) {
      message
    }
  }
`;

export async function adminAssignUserToStoreService(token: string, input: any) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(ASSIGN_USER_TO_STORE, input);
}
