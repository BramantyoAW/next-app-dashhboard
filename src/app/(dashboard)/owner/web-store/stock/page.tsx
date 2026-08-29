'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Stock adalah urusan MERCHANT/OUTLET, dikelola di dashboard owner inventory
 * (/dashboard/catalog/inventory). URL lama ini diarahkan ke sana.
 */
export default function RedirectWebStoreStock() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/catalog/inventory');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-sm text-slate-500">
      Mengalihkan ke Inventory…
    </div>
  );
}