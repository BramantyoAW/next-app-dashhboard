// src/graphql/query/settings/getAllSettings.ts
import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_ALL_SETTINGS = `
  query GetAllSettings {
    settings {
      id
      store_id
      key
      value
    }
  }
`;

export async function getAllSettingsService(token: string) {
  return graphqlClient.request(
    GET_ALL_SETTINGS,
    {},
    { Authorization: `Bearer ${token}` }
  );
}
