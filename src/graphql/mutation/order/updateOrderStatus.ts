import { gql } from 'graphql-request';
import { graphqlClient } from '@/graphql/graphqlClient';

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!, $tracking_number: String) {
    updateOrderStatus(id: $id, status: $status, tracking_number: $tracking_number) {
      id
      status
      tracking_number
    }
  }
`;

export async function updateOrderStatus(
  token: string,
  id: string | number,
  status: string,
  trackingNumber?: string,
) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  return graphqlClient.request<{
    updateOrderStatus: { id: string; status: string; tracking_number: string | null };
  }>(UPDATE_ORDER_STATUS, {
    id: String(id),
    status,
    tracking_number: trackingNumber ?? null,
  });
}
