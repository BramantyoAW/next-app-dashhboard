import { gqlFetch } from '@/lib/graphqlClient'

export async function merchantCreateStoreService(token: string, input: { name: string, description?: string, image?: any, phone?: string, address?: string, duplicate_products?: boolean }) {
  const query = `
    mutation MerchantCreateStore($input: MerchantCreateStoreInput!) {
      merchantCreateStore(input: $input) {
        id
        name
        image
      }
    }
  `
  return await gqlFetch<any>(query, { input }, token)
}
