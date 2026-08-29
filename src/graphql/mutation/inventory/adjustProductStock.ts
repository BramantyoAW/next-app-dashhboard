import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export type AdjustProductStockResponse = {
  adjustProductStock: {
    id: number;
    current_qty: number;
  };
};

const ADJUST_PRODUCT_STOCK = gql`
  mutation AdjustProductStock(
    $product_id: ID!
    $store_id: ID
    $change: Int!
    $source: String!
    $note: String
  ) {
    adjustProductStock(
      product_id: $product_id
      store_id: $store_id
      change: $change
      source: $source
      note: $note
    ) {
      id
      current_qty
    }
  }
`;

export async function adjustProductStock(
  token: string,
  { pid, chg, src, note, storeId }: { pid: number; chg: number; src: string; note?: string; storeId?: number | string | null }
): Promise<AdjustProductStockResponse> {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  return graphqlClient.request<AdjustProductStockResponse>(ADJUST_PRODUCT_STOCK, {
    product_id: pid,
    store_id: storeId ? String(storeId) : null,
    change: chg,
    source: src,
    note,
  });
}
