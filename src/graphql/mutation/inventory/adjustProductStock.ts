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
    $change: Int!
    $source: String!
    $note: String
  ) {
    adjustProductStock(
      product_id: $product_id
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
  { pid, chg, src, note }: { pid: number; chg: number; src: string; note?: string }
): Promise<AdjustProductStockResponse> {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  return graphqlClient.request<AdjustProductStockResponse>(ADJUST_PRODUCT_STOCK, {
    product_id: pid,
    change: chg,
    source: src,
    note,
  });
}
