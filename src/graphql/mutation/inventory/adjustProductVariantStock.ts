import { graphqlClient } from "@/graphql/graphqlClient";
import { gql } from "graphql-request";

export type AdjustVariantStockResponse = {
  adjustProductVariantStock: {
    id: string;
    variant_key: string;
    image?: string | null;
    price?: number | null;
    qty: number;
  };
};

const ADJUST_PRODUCT_VARIANT_STOCK = gql`
  mutation AdjustProductVariantStock(
    $master_product_id: ID!
    $store_id: ID!
    $variant_key: String!
    $change: Int!
    $source: String
    $note: String
    $image: String
    $price: Float
  ) {
    adjustProductVariantStock(
      master_product_id: $master_product_id
      store_id: $store_id
      variant_key: $variant_key
      change: $change
      source: $source
      note: $note
      image: $image
      price: $price
    ) {
      id
      variant_key
      image
      price
      qty
    }
  }
`;

export async function adjustProductVariantStock(
  token: string,
  args: {
    masterProductId: number | string;
    storeId: number | string;
    variantKey: string;
    change: number;
    source?: string;
    note?: string;
    image?: string | null;
    price?: number | null;
  }
): Promise<AdjustVariantStockResponse> {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  // PENTING: hanya kirim field yang memang disediakan pemanggil.
  // Jika image/price di-set `null` dari luar (args.image === null) maka
  // null tsb DITERUSKAN (untuk clear field), tapi jika TIDAK disediakan
  // (undefined) field tidak dikirim sama sekali → backend tidak menyentuhnya.
  // Sebelumnya `image: args.image ?? null` SELALU mengirim null → update
  // gambar menghapus harga, update harga menghapus gambar.
  const variables: Record<string, unknown> = {
    master_product_id: String(args.masterProductId),
    store_id: String(args.storeId),
    variant_key: args.variantKey,
    change: args.change,
    source: args.source ?? "manual-adjust",
    note: args.note ?? null,
  };
  if (args.image !== undefined) variables.image = args.image;
  if (args.price !== undefined) variables.price = args.price;

  return graphqlClient.request<AdjustVariantStockResponse>(
    ADJUST_PRODUCT_VARIANT_STOCK,
    variables
  );
}
