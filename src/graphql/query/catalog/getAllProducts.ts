import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

const GET_ALL_PRODUCTS_QUERY = gql`
  query GetAllProducts($storeId: ID!, $name: String, $limit: Int, $page: Int) {
    getAllProducts(
      store_id: $storeId
      name: $name
      limit: $limit
      page: $page
    ) {
      data {
        id
        sku
        name
        price
        description
        attributes {
          name
          value
        }
      }
      pagination {
        total
        current_page
        total_pages
      }
    }
  }
`

interface Attribute {
  id: number
  name: string
  value: string
}

interface Product {
  id: number
  sku: string
  name: string
  price: number
  description: string
  attributes: Attribute[]
}

interface GetAllProductsResponse {
  getAllProducts: {
    data: Product[]
    pagination: {
      total: number
      current_page: number
      total_pages: number
    }
  }
}

export async function getAllProducts(
  token: string,
  storeId: number,
  name: string,
  limit: number,
  page: number
): Promise<GetAllProductsResponse> {
  if (!token) throw new Error('Token tidak ditemukan')

  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  return await graphqlClient.request<GetAllProductsResponse>(GET_ALL_PRODUCTS_QUERY, {
    storeId,
    name,
    limit,
    page,
  })
}
