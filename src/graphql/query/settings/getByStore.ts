import { graphqlClient } from "@/graphql/graphqlClient";

export const GET_SETTINGS_BY_STORE = `
  query storeSettings($store_id: ID!) {
    storeSettings(store_id: $store_id) {
      key
      value
    }
  }
`;

const KEY_MAP: Record<string, string> = {
  "stock.min_threshold": "minimum_stock",
  "order.default_prefix": "order_prefix",
  "report.frequency": "report_schedule",
  "stock.default_warehouse": "default_warehouse",
  "stock.restock_reminder_days": "restock_reminder_days",
  "stock.sync_mode": "sync_mode",
};

export async function getSettingsByStoreService(token: string, storeId: number) {
  const res = await graphqlClient.request(
    GET_SETTINGS_BY_STORE,
    { store_id: storeId },
    { Authorization: `Bearer ${token}` }
  );

  const mapped: any = {};

  res.storeSettings.forEach((item: any) => {
    const key = KEY_MAP[item.key] || item.key;
    try {
      mapped[key] = JSON.parse(item.value);
    } catch {
      mapped[key] = item.value;
    }
  });

  console.log("🔥 RETURN MAPPED SHOULD RUN", mapped);

  return mapped; // <- WAJIB return mapped (bukan res)
}
