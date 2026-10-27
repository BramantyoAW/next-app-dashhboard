import { gql } from "graphql-request"
import { graphqlClient } from "@/graphql/graphqlClient"

export const GET_ORDERS_BY_STORE = gql`
  query GetOrdersByStore(
    $store_id: ID!,
    $order_number: String,
    $date_from: String,
    $date_to: String,
    $page: Int,
    $limit: Int
  ) {
    getOrdersByStore(
      store_id: $store_id,
      order_number: $order_number,
      date_from: $date_from,
      date_to: $date_to,
      page: $page,
      limit: $limit
    ) {
      data {
        id
        order_number
        total_amount
        discount
        shipping_cost
        shipping_address
        tracking_number
        status
        payment_status
        fulfillment_status
        channel
        additional_data
        created_at
        items {
          name
          product_id
          qty
          price
          subtotal
          discount
        }
        user {
          full_name
        }
        customer {
          name
          email
          phone
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

export type GetOrdersByStoreResponse = {
  getOrdersByStore: {
    data: {
      id: number
      order_number: string
      total_amount: number
      discount: number
      shipping_cost: number | null
      shipping_address: string | null
      tracking_number: string | null
      status: string
      payment_status: string | null
      fulfillment_status: string | null
      channel: string | null
      additional_data: string | null
      created_at: string
      items: {
        name: string
        product_id: number
        qty: number
        price: number
        subtotal: number | null
        discount: number
      }[]
      user: {
        full_name: string
      } | null
      customer: {
        name: string
        email: string
        phone: string | null
      } | null
    }[]
    pagination: {
      total: number
      current_page: number
      total_pages: number
    }
  }
}

export async function getOrdersByStore(token: string, store_id: number, page = 1, limit = 10) {
  graphqlClient.setHeader("Authorization", `Bearer ${token}`)
  return graphqlClient.request<GetOrdersByStoreResponse>(GET_ORDERS_BY_STORE, { store_id, page, limit })
}
