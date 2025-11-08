import { graphqlClient } from "@/graphql/graphqlClient"
import { gql } from "graphql-request"

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct(
    $id: ID!
    $store_id: ID!
    $sku: String!
    $name: String!
    $description: String
    $price: Float!
    $image: String
    $attributes: [ProductAttributeInput!]
  ) {
    updateProduct(
      id: $id
      store_id: $store_id
      sku: $sku
      name: $name
      description: $description
      price: $price
      image: $image
      attributes: $attributes
    ) {
      id
      name
      image
    }
  }
`

export interface UpdateProductResponse {
  updateProduct: {
    id: string
    name: string
    image: string
  }
}

export async function updateProduct(
  token: string,
  variables: {
    id: string
    store_id: string
    sku: string
    name: string
    description?: string
    price: number
    image: string
    attributes: { attribute_id: string; value: string }[]
  }
): Promise<UpdateProductResponse> {
  if (!token) throw new Error("Token not found")

  graphqlClient.setHeader("Authorization", `Bearer ${token}`)
  return graphqlClient.request<UpdateProductResponse>(UPDATE_PRODUCT, variables)
}
