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
    $attributes: [ProductAttributeInput!]
  ) {
    updateProduct(
      id: $id
      store_id: $store_id
      sku: $sku
      name: $name
      description: $description
      price: $price
      attributes: $attributes
    ) {
      id
      name
    }
  }
`

export interface UpdateProductResponse {
  updateProduct: {
    id: string
    name: string
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
    attributes: { attribute_id: string; value: string }[]
  }
): Promise<UpdateProductResponse> {
  if (!token) throw new Error("Token not found")

  graphqlClient.setHeader("Authorization", `Bearer ${token}`)
  return graphqlClient.request<UpdateProductResponse>(UPDATE_PRODUCT, variables)
}
