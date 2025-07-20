import { graphqlClient } from '../../graphqlClient'
import { gql } from 'graphql-request'

const CREATE_ATTRIBUTE_MUTATION = gql`
  mutation CreateProductAttribute(
    $storeId: ID!
    $name: String!
    $type: String!
  ) {
    createProductAttribute(
      store_id: $storeId
      name: $name
      type: $type
    ) {
      id
      store_id
      name
      type
    }
  }
`

export async function createAttributeService(storeId: number, name: string, type: string) {
  return await graphqlClient.request(CREATE_ATTRIBUTE_MUTATION, { storeId, name, type } )
}
