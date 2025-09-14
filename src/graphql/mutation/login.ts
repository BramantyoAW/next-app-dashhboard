import { gqlFetch } from '@/lib/graphqlClient';

const LOGIN_MUTATION = `
mutation Login($email:String!, $password:String!) {
  login(email:$email, password:$password) {
    access_token
    token_type
    expires_in
    user { id username full_name email role }
  }
}
`;

export async function loginService(email: string, password: string) {
  return gqlFetch<{ login: { access_token: string; token_type: string; expires_in: number; user: any } }>(
    LOGIN_MUTATION,
    { email, password }
  );
}
