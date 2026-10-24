import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export type VariantStockDTO = {
  id: string;
  variant_key: string;
  image?: string | null;
  price?: number | null;
  qty: number;
  logs?: Array<{ change: number; source?: string | null; note?: string | null; created_at: string }>;
};

export type GetProductVariantStocksResponse = {
  productVariantStocks: VariantStockDTO[];
};

const GET_PRODUCT_VARIANT_STOCKS = gql`
  query GetProductVariantStocks($store_id: ID!, $master_product_id: ID) {
    productVariantStocks(store_id: $store_id, master_product_id: $master_product_id) {
      id
      variant_key
      image
      price
      qty
      logs {
        change
        source
        note
        created_at
      }
    }
  }
`;

export async function getProductVariantStocks(
  token: string,
  storeId: number | string,
  masterProductId?: number | string | null
): Promise<GetProductVariantStocksResponse> {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  return graphqlClient.request<GetProductVariantStocksResponse>(
    GET_PRODUCT_VARIANT_STOCKS,
    {
      store_id: String(storeId),
      master_product_id: masterProductId ? String(masterProductId) : null,
    }
  );
}
