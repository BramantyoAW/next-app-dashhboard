import { SignInForm } from '@/components/storefront/SignInForm';

export default async function StorefrontSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { hash } = await params;
  const { next } = await searchParams;
  return <SignInForm hash={hash} nextPath={next ?? `/storefront/${hash}`} />;
}
