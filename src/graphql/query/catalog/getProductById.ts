import { graphqlClient } from "@/graphql/graphqlClient"
import { gql } from "graphql-request"

export const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: ID!) {
    getProductById(id: $id) {
      id
      name
      price
      description
      attributes {
        name
        value
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
  name: string
  price: number
  description: string
  attributes: ProductAttribute[]
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
