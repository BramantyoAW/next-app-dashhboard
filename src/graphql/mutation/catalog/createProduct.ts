import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct(
    $storeId: ID!,
    $storeIds: [ID!],
    $sku: String!,
    $name: String!,
    $description: String,
    $price: Float!,
    $image: String, 
    $attributes: [ProductAttributeInput!]
  ) {
    createProduct(
      store_id: $storeId,
      store_ids: $storeIds,
      sku: $sku,
      name: $name,
      description: $description,
      price: $price,
      image: $image,
      attributes: $attributes
    ) {
      id
      name
      image
    }
  }
`

interface AttributeInput {
  name: string
  value: string
}

interface CreateProductResponse {
  createProduct: {
    id: string
    name: string
    image: string
  }
}

export async function createProduct(
  token: string,
  storeId: number,
  sku: string,
  name: string,
  description: string,
  price: number,
  attributes: AttributeInput[],
  image?: string,
  storeIds?: number[]
): Promise<CreateProductResponse> {
  if (!token) throw new Error('Token tidak ditemukan')

  graphqlClient.setHeader('Authorization', `Bearer ${token}`)

  return await graphqlClient.request<CreateProductResponse>(
    CREATE_PRODUCT_MUTATION,
    { storeId, storeIds: storeIds && storeIds.length > 0 ? storeIds : undefined, sku, name, description, price, attributes, image }
  )
}
