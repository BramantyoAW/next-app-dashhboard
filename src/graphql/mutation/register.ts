import { gqlFetch } from '@/lib/graphqlClient'

export const registerService = async (input: any) => {
  const query = `
    mutation RegisterWithStore($input: RegisterWithStoreInput!) {
      registerWithStore(input: $input) {
        access_token
        token_type
        expires_in
        user {
          id
          username
          full_name
          email
          status
        }
      }
    }
  `;

  return await gqlFetch<any>(query, { input });
};
