import { graphqlClient } from '@/graphql/graphqlClient'

export const GET_IMPORT_HISTORIES = `
  query GetImportHistories($store_id: ID!) {
    getImportHistories(store_id: $store_id) {
      id
      filename
      total_rows
      created_count
      updated_count
      failed_count
      status
      created_at
    }
  }
`

export async function getImportHistories(token: string, storeId: string) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  const res = await graphqlClient.request<{ getImportHistories: any[] }>(
    GET_IMPORT_HISTORIES,
    { store_id: storeId }
  )
  return res.getImportHistories
}
