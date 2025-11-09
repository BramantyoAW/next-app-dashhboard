import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_ALL_INVENTORY = `
  query GetAllInventory($store_id: ID!, $search: String) {
    getAllInventory(store_id: $store_id, search: $search) {
      product_id
      current_qty
      product {
        id
        sku
        name
      }
    }
  }
`

export async function getAllInventory(token: string, storeId: string, search = '') {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ getAllInventory: any[] }>(
    GET_ALL_INVENTORY,
    { store_id: storeId, search }
  )
  return res.getAllInventory
}
