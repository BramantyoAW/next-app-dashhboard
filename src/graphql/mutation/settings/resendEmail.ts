import { graphqlClient } from "@/graphql/graphqlClient";

export const RESEND_EMAIL = `
  mutation ResendEmail($id: ID!) {
    resendEmail(id: $id) {
      id
      to
      status
    }
  }
`;

export async function adminResendEmail(token: string, id: string) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request<any>(RESEND_EMAIL, { id });
}
