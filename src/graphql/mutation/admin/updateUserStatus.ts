import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export const UPDATE_USER_STATUS = gql`
  mutation UpdateUserStatus($id: ID!, $status: Int!) {
    updateUserStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export async function adminUpdateUserStatusService(token: string, id: string | number, status: number) {
  return graphqlClient
    .setHeader("Authorization", `Bearer ${token}`)
    .request<any>(UPDATE_USER_STATUS, { id, status });
}
