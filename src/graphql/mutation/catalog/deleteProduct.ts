import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

const DELETE_PRODUCT_MUTATION = gql`
  mutation($id: ID!) {
    deleteProduct(id: $id)
  }
`

export async function deleteProductService(token: string, id: number) {
  if (!token) throw new Error('Token tidak ditemukan')
  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  return await graphqlClient.request(DELETE_PRODUCT_MUTATION, { id })
}
