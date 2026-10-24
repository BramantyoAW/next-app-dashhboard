'use client';

import { useRouter } from 'next/navigation';
import { clearCustomerToken } from '@/lib/customer-token';

export function CustomerLogoutButton({ hash }: { hash: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => { clearCustomerToken(); router.replace(`/storefront/${hash}/sign-in?next=/storefront/${hash}/account`); router.refresh(); }}
      className="whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
    >
      Keluar
    </button>
  );
}
