import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_INVENTORY_POOLED = `
  query GetInventoryPooled($search: String, $page: Int, $limit: Int) {
    getInventoryPooled(search: $search, page: $page, limit: $limit) {
      data {
        master_product_id
        sku
        name
        has_variant
        per_store {
          store_id
          qty
        }
        total_qty
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

export type InventoryPooledItem = {
  master_product_id: string
  sku: string | null
  name: string
  has_variant: boolean
  per_store: { store_id: string; qty: number }[]
  total_qty: number
}

export async function getInventoryPooled(token: string, search = '', page = 1, limit = 20) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ getInventoryPooled: any }>(
    GET_INVENTORY_POOLED,
    { search, page, limit }
  )
  return res.getInventoryPooled
}
