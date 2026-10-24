import { gql } from 'graphql-request';
import { graphqlClient } from '@/graphql/graphqlClient';

export const ORDER_INVOICE = gql`
  query OrderInvoice($id: ID!) {
    orderInvoice(id: $id)
  }
`;

/** Fetch invoice PDF (base64) and trigger a browser download. */
export async function downloadOrderInvoice(token: string, orderId: string | number, fileName?: string) {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  const res = await graphqlClient.request<{ orderInvoice: string }>(ORDER_INVOICE, {
    id: String(orderId),
  });
  const b64 = res.orderInvoice;
  if (!b64) throw new Error('Invoice kosong');

  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);

  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? `invoice-${orderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
