import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct(
    $storeId: ID!,
    $sku: String!,
    $name: String!,
    $description: String!,
    $price: Float!,
    $image: String, 
    $attributes: [ProductAttributeInput!]
  ) {
    createProduct(
      store_id: $storeId,
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
  attribute_id: number | string
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
  image?: string
): Promise<CreateProductResponse> {
  if (!token) throw new Error('Token tidak ditemukan')

  graphqlClient.setHeader('Authorization', `Bearer ${token}`)

  return await graphqlClient.request<CreateProductResponse>(
    CREATE_PRODUCT_MUTATION,
    { storeId, sku, name, description, price, attributes, image }
  )
}