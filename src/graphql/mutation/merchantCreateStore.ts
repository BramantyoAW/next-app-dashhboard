import { gqlFetch } from '@/lib/graphqlClient'

export async function merchantCreateStoreService(token: string, input: { name: string, description?: string, image?: any }) {
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
