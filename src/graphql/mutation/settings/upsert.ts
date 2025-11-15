import { graphqlClient } from "@/graphql/graphqlClient";

export const UPSERT_SETTINGS = `
  mutation UpsertStoreSettings($store_id: ID!, $input: [StoreSettingInput!]!) {
    upsertStoreSettings(store_id: $store_id, input: $input) {
      id
      key
      value
      store_id
    }
  }
`;

const REVERSE_KEY_MAP: Record<string, string> = {
  minimum_stock: "stock.min_threshold",
  order_prefix: "order.default_prefix",
  report_schedule: "report.frequency",
  default_warehouse: "stock.default_warehouse",
  restock_reminder_days: "stock.restock_reminder_days",
  sync_mode: "stock.sync_mode",
};

export async function upsertSettingService(token: string, storeId: number, key: string, value: any) {

  const realKey = REVERSE_KEY_MAP[key] || key;

  const serializedValue = 
    typeof value === "object" ? JSON.stringify(value) : String(value);

  const input = [
    {
      key: realKey,
      value: serializedValue,
      type: "string"
    }
  ];

  return graphqlClient.request(
    UPSERT_SETTINGS,
    { store_id: storeId, input },
    { Authorization: `Bearer ${token}` }
  );
}
