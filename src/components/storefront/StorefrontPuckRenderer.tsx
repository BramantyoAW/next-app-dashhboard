'use client';

import { useEffect, useState } from 'react';
import { Render, resolveAllData, type Data } from '@puckeditor/core';
import { puckLabConfig } from '@/lib/puckLabConfig';

/**
 * Renderer storefront untuk data Puck (dari page builder).
 *
 * Data puck disimpan sebagai JSON di web_pages.blocks ({ puck, legacy }).
 * Komponen ini (client) me-resolve data (isi default props) lalu me-render
 * dengan config komponen yang sama seperti editor — sehingga apa yang owner
 * rancang di editor tampil persis di toko publik.
 *
 * Dipakai oleh:
 *  - (shop)/page.tsx  (home)
 *  - (fullpage)/[slug]/page.tsx (halaman about/faq/kontak dsb.)
 */
export default function StorefrontPuckRenderer({
  data,
  products = [],
  storeName = '',
}: {
  data: Data;
  products?: { id: string; name: string; price: string; image?: string | null }[];
  storeName?: string;
}) {
  const [resolved, setResolved] = useState<Data | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    resolveAllData(data, puckLabConfig as any)
      .then((r) => {
        if (on) setResolved(r as Data);
      })
      .catch((e: any) => {
        if (on) setErr(e?.message ?? 'Gagal merender halaman');
      });
    return () => {
      on = false;
    };
  }, [data]);

  if (err) {
    return (
      <div className="px-6 py-16 text-center text-sm text-red-600">
        Gagal merender halaman: {err}
      </div>
    );
  }
  if (!resolved) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Memuat halaman...
      </div>
    );
  }
  return (
    <div className="storefront-puck-root" style={{ minHeight: '100vh' }}>
      <Render config={puckLabConfig} data={resolved} />
    </div>
  );
}
