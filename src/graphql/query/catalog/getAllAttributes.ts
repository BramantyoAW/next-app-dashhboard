// src/graphql/query/catalog/getAllAttributes.ts

import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

const GET_ALL_ATTRIBUTE_QUERY = gql`
  query GetAllAttribute($storeId: ID!) {
    getAllAttribute(store_id: $storeId, limit: 10, page: 1) {
      data {
        id
        name
        type
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
  id: number | string
  name: string
  type: string
}

interface GetAllAttributeResponse {
  getAllAttribute: {
    data: Attribute[]
    pagination: {
      total: number
      current_page: number
      total_pages: number
    }
  }
}

export async function getAllAttribute(token: string, storeId: number): Promise<GetAllAttributeResponse> {
  if (!token) throw new Error('Token tidak ditemukan')

  graphqlClient.setHeader('Authorization', `Bearer ${token}`)
  return await graphqlClient.request<GetAllAttributeResponse>(GET_ALL_ATTRIBUTE_QUERY, { storeId })
}
