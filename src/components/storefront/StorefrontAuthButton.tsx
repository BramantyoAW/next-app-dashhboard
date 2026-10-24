'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { getCustomerToken } from '@/lib/customer-token';

export function StorefrontAuthButton({ hash }: { hash: string }) {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(!!getCustomerToken());
  }, []);
  if (authed) {
    return (
      <Link
        href={`/storefront/${hash}/account`}
        className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
      >
        <User className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">Akun</span>
      </Link>
    );
  }
  return (
    <Link
      href={`/storefront/${hash}/sign-in`}
      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
    >
      <User className="h-[18px] w-[18px]" />
      <span className="hidden sm:inline">Masuk</span>
    </Link>
  );
}
