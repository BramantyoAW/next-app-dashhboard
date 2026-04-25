import { gqlFetch } from '@/lib/graphqlClient';

const GET_PUBLIC_APP_SETTINGS = `
  query GetPublicAppSettings($keys: [String!]!) {
    getPublicAppSettings(keys: $keys) {
      key
      value
    }
  }
`;

export async function getPublicAppSettingsService(keys: string[]) {
  return gqlFetch<{ getPublicAppSettings: { key: string; value: string }[] }>(
    GET_PUBLIC_APP_SETTINGS,
    { keys }
  );
}
