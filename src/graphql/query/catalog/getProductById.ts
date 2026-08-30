import { graphqlClient } from "@/graphql/graphqlClient"
import { gql } from "graphql-request"

export const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: ID!) {
    getProductById(id: $id) {
      id
      sku
      name
      price
      image
      description
      attributes {
        name
        value
      }
      store_products {
        store_id
        is_active
      }
    }
  }
`

export type ProductAttribute = {
  name: string
  value: string
}

export type Product = {
  id: string
  sku: string
  name: string
  price: number
  image: string
  description: string
  attributes: ProductAttribute[]
  store_products?: { store_id: string; is_active: boolean }[]
}

export interface GetProductByIdResponse {
  getProductById: Product
}

export async function getProductById(
  token: string,
  id: string // <-- string, bukan number
): Promise<GetProductByIdResponse> {
  if (!token) throw new Error("Token not found")

  graphqlClient.setHeader("Authorization", `Bearer ${token}`)
  return graphqlClient.request<GetProductByIdResponse>(GET_PRODUCT_BY_ID, { id })
}
