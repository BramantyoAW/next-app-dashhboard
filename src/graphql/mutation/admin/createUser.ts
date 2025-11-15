import { graphqlClient } from "@/graphql/graphqlClient";

export const CREATE_USER = `
  mutation RegisterWithStore($input: RegisterWithStoreInput!) {
    registerWithStore(input: $input) {
      user {
        id
        username
        full_name
        email
      }
    }
  }
`;

export async function adminCreateUserService(token: string, input: any) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request(CREATE_USER, { input });
}
