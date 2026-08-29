import { gql } from 'graphql-request';
import { graphqlClient } from '@/graphql/graphqlClient';

export const GET_WEB_ORDERS = gql`
  query GetWebOrders($store_id: ID!, $page: Int, $limit: Int, $status: String) {
    getOrdersByStore(store_id: $store_id, page: $page, limit: $limit, is_web: true, status: $status) {
      data {
        id
        order_number
        web_order_number
        status
        is_web
        total_amount
        shipping_cost
        shipping_address
        tracking_number
        created_at
        items {
          id
          name
          qty
          price
          subtotal
        }
        customer {
          id
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
`;

export type WebOrderItem = {
  id: string;
  name: string | null;
  qty: number;
  price: number;
  subtotal: number;
};

export type WebOrderCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type WebOrder = {
  id: string;
  order_number: string;
  web_order_number: string | null;
  status: string;
  is_web: boolean;
  total_amount: number;
  shipping_cost: number | null;
  shipping_address: string | null;
  tracking_number: string | null;
  created_at: string;
  items: WebOrderItem[];
  customer: WebOrderCustomer | null;
};

export type GetWebOrdersResponse = {
  getOrdersByStore: {
    data: WebOrder[];
    pagination: { total: number; current_page: number; total_pages: number };
  };
};

export async function getWebOrders(
  token: string,
  store_id: string | number,
  opts: { page?: number; limit?: number; status?: string } = {},
) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  return graphqlClient.request<GetWebOrdersResponse>(GET_WEB_ORDERS, {
    store_id: String(store_id),
    page: opts.page ?? 1,
    limit: opts.limit ?? 20,
    status: opts.status ?? null,
  });
}
