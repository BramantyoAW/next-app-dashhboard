import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export type StockLogDTO = {
  change: number;
  source: string;
  note?: string | null;
  created_at: string;
};

export type GetProductStockResponse = {
  productStock: {
    current_qty: number;
    logs: StockLogDTO[];
  } | null;
};

const GET_PRODUCT_STOCK = gql`
  query GetProductStock($product_id: ID!) {
    productStock(product_id: $product_id) {
      current_qty
      logs {
        change
        source
        note
        created_at
      }
    }
  }
`;

export async function getProductStock(
  token: string,
  productId: number
): Promise<GetProductStockResponse> {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  return graphqlClient.request<GetProductStockResponse>(GET_PRODUCT_STOCK, {
    product_id: productId,
  });
}
