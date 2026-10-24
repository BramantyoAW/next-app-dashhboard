import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_STOCK_LOGS = `
  query GetStockLogs($product_id: ID!) {
    productStockLogs(product_id: $product_id) {
      id
      store_id
      change
      source
      note
      created_at
      store {
        id
        name
      }
    }
  }
`

export const GET_VARIANT_STOCK_LOGS = `
  query GetVariantStockLogs($master_product_id: ID!) {
    productVariantStockLogs(master_product_id: $master_product_id) {
      id
      store_id
      change
      source
      note
      created_at
      store {
        id
        name
      }
      variant_stock {
        variant_key
      }
    }
  }
`

export async function getStockLogs(token: string, productId: string) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ productStockLogs: any[] }>(
    GET_STOCK_LOGS,
    { product_id: productId }
  )
  return res.productStockLogs
}

export async function getVariantStockLogs(token: string, masterProductId: string) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ productVariantStockLogs: any[] }>(
    GET_VARIANT_STOCK_LOGS,
    { master_product_id: masterProductId }
  )
  return res.productVariantStockLogs
}
