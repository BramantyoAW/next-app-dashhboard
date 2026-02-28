import { graphqlClient } from "@/graphql/graphqlClient";

export const TEST_SMTP_CONNECTION = `
  mutation TestSmtpConnection(
    $host: String!, 
    $port: Int!, 
    $username: String, 
    $password: String, 
    $encryption: String, 
    $from_address: String!, 
    $from_name: String
  ) {
    testSmtpConnection(
      host: $host, 
      port: $port, 
      username: $username, 
      password: $password, 
      encryption: $encryption, 
      from_address: $from_address, 
      from_name: $from_name
    ) {
      status
      message
    }
  }
`;

export async function adminTestSmtpConnectionService(token: string, input: any) {
  return graphqlClient.setHeader('Authorization', `Bearer ${token}`).request<any>(TEST_SMTP_CONNECTION, input);
}
