import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_ALL_INVENTORY = `
  query GetAllInventory($store_id: ID!, $search: String, $page: Int, $limit: Int) {
    getAllInventory(store_id: $store_id, search: $search, page: $page, limit: $limit) {
      data {
        product_id
        current_qty
        product {
          id
          sku
          name
        }
      }
      pagination {
        total
        current_page
        per_page
        total_pages
      }
    }
  }
`

export async function getAllInventory(token: string, storeId: string, search = '', page = 1, limit = 20) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ getAllInventory: any }>(
    GET_ALL_INVENTORY,
    { store_id: storeId, search, page, limit }
  )
  return res.getAllInventory
}
