import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export const UPSERT_APP_SETTINGS = gql`
  mutation UpsertAppSettings($input: [UpsertAppSettingInput!]!) {
    upsertAppSettings(input: $input) {
      id
      key
      value
    }
  }
`;

export async function adminUpsertAppSettingsService(token: string, input: any[]) {
  return graphqlClient
    .setHeader("Authorization", `Bearer ${token}`)
    .request<any>(UPSERT_APP_SETTINGS, { input });
}
