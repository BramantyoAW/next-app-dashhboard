import { gqlFetch } from '@/lib/graphqlClient';

const GET_SNAP_TOKEN = `
  mutation GetMidtransSnapToken($store_id: ID!, $amount: Float!) {
    getMidtransSnapToken(store_id: $store_id, amount: $amount) {
      token
      redirect_url
    }
  }
`;

const SYNC_PAYMENT_STATUS = `
  mutation SyncPaymentStatus($order_id: String!) {
    syncPaymentStatus(order_id: $order_id) {
      id
      status
    }
  }
`;

export async function getMidtransSnapTokenService(token: string, store_id: string, amount: number) {
  return gqlFetch<any>(GET_SNAP_TOKEN, { store_id, amount }, token);
}

export async function syncPaymentStatusService(token: string, order_id: string) {
  return gqlFetch<any>(SYNC_PAYMENT_STATUS, { order_id }, token);
}
