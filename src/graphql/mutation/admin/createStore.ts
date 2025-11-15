import { graphqlClient } from "@/graphql/graphqlClient";

export const CREATE_STORE = `
  mutation CreateStore($name: String!) {
    createStore(name: $name) {
      id
      name
      created_at
    }
  }
`;

export async function adminCreateStoreService(token: string, name: string) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(CREATE_STORE, { name });
}
