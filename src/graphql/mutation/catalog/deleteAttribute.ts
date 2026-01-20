import { graphqlClient } from '../../graphqlClient'
import { gql } from 'graphql-request'

const DELETE_ATTRIBUTE_MUTATION = gql`
  mutation($id: ID!) {
    deleteProductAttribute(id: $id)
  }
`

export async function deleteAttributeService(id: number) {
  return await graphqlClient.request(DELETE_ATTRIBUTE_MUTATION, { id })
}