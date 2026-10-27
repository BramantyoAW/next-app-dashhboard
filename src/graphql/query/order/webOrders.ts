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
        payment_status
        fulfillment_status
        lifecycle_status
        channel
        paid_at
        completed_at
        cancelled_at
        cancel_reason
        expires_at
        is_web
        total_amount
        shipping_cost
        shipping_address
        tracking_number
        additional_data
        created_at
        items {
          id
          store_id
          name
          qty
          price
          subtotal
          store {
            id
            name
          }
        }
        customer {
          id
          name
          email
          phone
        }
        shipments {
          id
          status
          courier_code
          courier_name
          service
          tracking_number
          cost
          weight_gram
          shipped_at
          delivered_at
          fulfilled_items
          created_at
        }
        statusHistories {
          id
          field
          from
          to
          actor_type
          actor_id
          note
          created_at
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
  store_id?: string | null;
  name: string | null;
  qty: number;
  price: number;
  subtotal: number;
  store?: { id: string; name: string } | null;
};

export type WebOrderCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type WebOrderShipment = {
  id: string;
  status: string;
  courier_code: string | null;
  courier_name: string | null;
  service: string | null;
  tracking_number: string | null;
  cost: number | null;
  weight_gram: number | null;
  shipped_at: string | null;
  delivered_at: string | null;
  fulfilled_items: { order_item_id: number | string; qty: number }[] | null;
  created_at: string;
};

export type WebOrderHistory = {
  id: string;
  field: string;
  from: string | null;
  to: string;
  actor_type: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
};

export type WebOrder = {
  id: string;
  order_number: string;
  web_order_number: string | null;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  lifecycle_status: string;
  channel: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  expires_at: string | null;
  is_web: boolean;
  total_amount: number;
  shipping_cost: number | null;
  shipping_address: string | null;
  tracking_number: string | null;
  additional_data?: { unique_amount?: number; base_amount?: number; payment_method?: { name?: string }; [k: string]: unknown } | null;
  created_at: string;
  items: WebOrderItem[];
  customer: WebOrderCustomer | null;
  shipments: WebOrderShipment[];
  statusHistories: WebOrderHistory[];
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
