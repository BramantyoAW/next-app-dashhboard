import { CheckoutForm } from '@/components/storefront/CheckoutForm';

export default async function StorefrontCheckoutPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  return <CheckoutForm hash={hash} />;
}
