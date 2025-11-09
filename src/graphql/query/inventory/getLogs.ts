import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_STOCK_LOGS = `
  query GetStockLogs($product_id: ID!) {
    productStockLogs(product_id: $product_id) {
      id
      change
      source
      note
      created_at
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
