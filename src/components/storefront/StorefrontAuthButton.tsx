'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { getCustomerToken, clearCustomerToken } from '@/lib/customer-token';

export function StorefrontAuthButton({ hash }: { hash: string }) {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(!!getCustomerToken());
  }, []);
  if (authed) {
    return (
      <button
        onClick={() => {
          clearCustomerToken();
          setAuthed(false);
          window.location.href = `/storefront/${hash}`;
        }}
        className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-neutral-100"
      >
        <User className="h-4 w-4" />
        <span>Logout</span>
      </button>
    );
  }
  return (
    <Link
      href={`/storefront/${hash}/sign-in`}
      className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-neutral-100"
    >
      <User className="h-4 w-4" />
      <span>Masuk</span>
    </Link>
  );
}
