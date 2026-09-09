import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { gqlFetchServer } from '@/lib/gql-server';
import { CustomerAccountShell, type AccountCustomer } from '@/components/storefront/CustomerAccountShell';
import { ProductGrid, type StorefrontProduct } from '@/components/storefront/ui/ProductCard';

export default async function WishlistPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const token = (await cookies()).get('customer_token')?.value;
  if (!token) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account/wishlist`);
  const data = await gqlFetchServer<{ customerMe: AccountCustomer | null; customerWishlist: StorefrontProduct[] }>({
    query: `query { customerMe { id name email phone created_at } customerWishlist(web_store_slug: "${hash}") { id master_product { id sku name price image } price_override image is_active } }`,
    token,
  });
  if (!data?.customerMe) redirect(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account/wishlist`);
  const items = data.customerWishlist ?? [];
  return (
    <CustomerAccountShell hash={hash} customer={data.customerMe} active="wishlist" title="Wishlist" description="Produk yang Anda tandai sebagai favorit.">
      {items.length ? (
        <ProductGrid hash={hash} products={items} heading={`${items.length} produk favorit`} count={false} />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">🤍</div>
          <h2 className="mt-3 text-lg font-bold">Wishlist masih kosong</h2>
          <p className="mt-1 text-sm text-slate-500">Ketuk ikon hati pada produk untuk menyimpannya di sini.</p>
          <Link href={`/storefront/${hash}`} className="mt-5 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Mulai Belanja
          </Link>
        </section>
      )}
    </CustomerAccountShell>
  );
}
