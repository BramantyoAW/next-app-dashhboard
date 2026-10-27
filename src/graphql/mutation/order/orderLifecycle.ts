import { gql } from 'graphql-request';
import { graphqlClient } from '@/graphql/graphqlClient';

/**
 * Mutation order berbasis niat.
 *
 * Tidak ada lagi `updateOrderStatus(status: String!)` yang mengizinkan lompatan
 * bebas. Setiap fungsi di sini satu aksi nyata, dan server yang memutuskan
 * apakah aksi itu sah — UI hanya menampilkan tombol yang relevan.
 */

export type OrderShipment = {
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
  fulfilled_items:
    | { order_item_id: number | string; qty: number }[]
    | null;
  created_at: string;
};

export type OrderHistoryEntry = {
  id: string;
  field: string;
  from: string | null;
  to: string;
  actor_type: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
};

/** Potongan `Order` yang dipakai bersama semua mutation di bawah. */
const ORDER_CORE = gql`
  fragment OrderCore on Order {
    id
    order_number
    status
    payment_status
    fulfillment_status
    lifecycle_status
    channel
    total_amount
    shipping_cost
    shipping_address
    tracking_number
    additional_data
    created_at
    paid_at
    completed_at
    cancelled_at
    cancel_reason
    expires_at
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
`;

export type OrderCore = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  lifecycle_status: string;
  channel: string | null;
  total_amount: number;
  shipping_cost: number | null;
  shipping_address: string | null;
  tracking_number: string | null;
  additional_data?: { unique_amount?: number; base_amount?: number } | null;
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  expires_at: string | null;
  items: {
    id: string;
    store_id?: string | null;
    name: string | null;
    qty: number;
    price: number;
    subtotal: number;
    store?: { id: string; name: string } | null;
  }[];
  customer: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  shipments: OrderShipment[];
  statusHistories: OrderHistoryEntry[];
};

const M = {
  confirmPayment: gql`
    ${ORDER_CORE}
    mutation ConfirmPayment($id: ID!, $note: String) {
      orderConfirmPayment(id: $id, note: $note) {
        ...OrderCore
      }
    }
  `,
  createShipment: gql`
    ${ORDER_CORE}
    mutation CreateShipment($input: CreateShipmentInput!) {
      orderCreateShipment(input: $input) {
        ...OrderCore
      }
    }
  `,
  shipShipment: gql`
    ${ORDER_CORE}
    mutation ShipShipment($id: ID!) {
      orderShipShipment(shipment_id: $id) {
        ...OrderCore
      }
    }
  `,
  deliverShipment: gql`
    ${ORDER_CORE}
    mutation DeliverShipment($id: ID!) {
      orderDeliverShipment(shipment_id: $id) {
        ...OrderCore
      }
    }
  `,
  complete: gql`
    ${ORDER_CORE}
    mutation CompleteOrder($id: ID!, $note: String) {
      orderComplete(id: $id, note: $note) {
        ...OrderCore
      }
    }
  `,
  cancel: gql`
    ${ORDER_CORE}
    mutation CancelOrder($id: ID!, $reason: String, $restock: Boolean) {
      orderCancel(id: $id, reason: $reason, restock: $restock) {
        ...OrderCore
      }
    }
  `,
};

function auth(token: string) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
}

export async function orderConfirmPayment(token: string, id: string | number, note?: string) {
  auth(token);
  return graphqlClient.request<{ orderConfirmPayment: OrderCore }>(M.confirmPayment, {
    id: String(id),
    note: note ?? null,
  });
}

export async function orderCreateShipment(
  token: string,
  input: {
    order_id: string | number;
    courier_code?: string;
    courier_name?: string;
    service?: string;
    tracking_number?: string;
    cost?: number;
    weight_gram?: number;
    items?: { order_item_id: string | number; qty: number }[];
  },
) {
  auth(token);
  return graphqlClient.request<{ orderCreateShipment: OrderCore }>(M.createShipment, {
    input: { ...input, order_id: String(input.order_id) },
  });
}

export async function orderShipShipment(token: string, shipmentId: string | number) {
  auth(token);
  return graphqlClient.request<{ orderShipShipment: OrderCore }>(M.shipShipment, {
    id: String(shipmentId),
  });
}

export async function orderDeliverShipment(token: string, shipmentId: string | number) {
  auth(token);
  return graphqlClient.request<{ orderDeliverShipment: OrderCore }>(M.deliverShipment, {
    id: String(shipmentId),
  });
}

export async function orderComplete(token: string, id: string | number, note?: string) {
  auth(token);
  return graphqlClient.request<{ orderComplete: OrderCore }>(M.complete, {
    id: String(id),
    note: note ?? null,
  });
}

export async function orderCancel(
  token: string,
  id: string | number,
  reason?: string,
  restock = true,
) {
  auth(token);
  return graphqlClient.request<{ orderCancel: OrderCore }>(M.cancel, {
    id: String(id),
    reason: reason ?? null,
    restock,
  });
}
