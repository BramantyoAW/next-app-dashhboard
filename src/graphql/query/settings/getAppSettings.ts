import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export const GET_APP_SETTINGS = gql`
  query GetAppSettings {
    appSettings {
      id
      key
      value
      type
    }
  }
`;

export async function adminGetAppSettingsService(token: string) {
  return graphqlClient
    .setHeader("Authorization", `Bearer ${token}`)
    .request<any>(GET_APP_SETTINGS);
}
