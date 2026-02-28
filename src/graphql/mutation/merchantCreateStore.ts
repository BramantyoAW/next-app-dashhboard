import { graphqlClient } from '../graphqlClient'
import { gql } from 'graphql-request'

const MERCHANT_CREATE_STORE_MUTATION = gql`
  mutation MerchantCreateStore($input: MerchantCreateStoreInput!) {
    merchantCreateStore(input: $input) {
      id
      name
      image
    }
  }
`

export async function merchantCreateStoreService(token: string, input: { name: string, description?: string, image?: any }) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  return await graphqlClient.request(MERCHANT_CREATE_STORE_MUTATION, { input })
}
