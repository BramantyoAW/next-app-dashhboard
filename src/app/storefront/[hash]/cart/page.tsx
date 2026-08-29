import { CartView } from '@/components/storefront/CartView';

export default async function StorefrontCartPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { hash } = await params;
  const { checkout } = await searchParams;
  return <CartView hash={hash} jumpToCheckout={checkout === '1'} />;
}
