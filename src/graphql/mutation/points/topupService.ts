import { gqlFetch } from '@/lib/graphqlClient';

const GET_SNAP_TOKEN = `
  mutation GetMidtransSnapToken($store_id: ID!, $amount: Float!, $purpose: String) {
    getMidtransSnapToken(store_id: $store_id, amount: $amount, purpose: $purpose) {
      token
      redirect_url
      order_id
      client_key
      is_production
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

/**
 * purpose: 'order' (poin order) atau 'ai' (AI Point).
 *
 * Tujuannya disimpan di payment_histories supaya webhook menambah saldo yang
 * benar saat pembayaran selesai.
 */
export async function getMidtransSnapTokenService(
  token: string,
  store_id: string,
  amount: number,
  purpose: 'order' | 'ai' = 'order',
) {
  return gqlFetch<any>(GET_SNAP_TOKEN, { store_id, amount, purpose }, token);
}

export async function syncPaymentStatusService(token: string, order_id: string) {
  return gqlFetch<any>(SYNC_PAYMENT_STATUS, { order_id }, token);
}
