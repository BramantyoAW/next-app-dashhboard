'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { gqlFetch } from '@/lib/graphqlClient';

declare global {
  interface Window {
    snap: any;
  }
}

/**
 * Tombol "Bayar Sekarang" untuk order yg memakai Midtrans (storefront).
 * - Minta snap token + client key + mode dari BE (getWebOrderPayment).
 * - Load Snap.js dinamis (sandbox/production).
 * - Buka popup Snap; kalau tertutup sebelum selesai, customer bisa klik lagi
 *   dari halaman order / riwayat (token disimpan BE, dibuat ulang bila perlu).
 */
export default function MidtransPayButton({
  hash,
  orderId,
  customerToken,
}: {
  hash: string;
  orderId: string;
  customerToken: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function loadSnapScript(isProduction: boolean, clientKey: string): Promise<void> {
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    const existing = document.querySelector(`script[src="${snapUrl}"]`) as HTMLScriptElement | null;
    if (existing && window.snap) {
      return Promise.resolve();
    }
    const oldScripts = document.querySelectorAll('script[src*="midtrans.com/snap/snap.js"]');
    oldScripts.forEach((s) => s.remove());
    delete window.snap;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = snapUrl;
      script.setAttribute('data-client-key', clientKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Gagal memuat layanan pembayaran.'));
      document.body.appendChild(script);
    });
  }

  async function pay() {
    if (!customerToken) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await gqlFetch<{
        getWebOrderPayment: {
          snap_token: string;
          client_key: string;
          is_production: boolean;
        };
      }>(
        `mutation($id: ID!) { getWebOrderPayment(order_id: $id) { snap_token client_key is_production } }`,
        { id: orderId },
        customerToken,
      );
      const p = res?.getWebOrderPayment;
      if (!p?.snap_token) {
        setErr('Token pembayaran tidak ditemukan. Silakan hubungi penjual.');
        setLoading(false);
        return;
      }
      await loadSnapScript(p.is_production, p.client_key);
      window.snap?.pay(p.snap_token, {
        onSuccess: () => { window.location.href = `/storefront/${hash}/orders/${orderId}`; },
        onPending: () => { setLoading(false); },
        onError: () => { setLoading(false); setErr('Pembayaran gagal. Coba lagi.'); },
        onClose: () => { setLoading(false); },
      });
    } catch (e: any) {
      setErr(e?.message || 'Gagal memulai pembayaran.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={pay}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {loading ? 'Menyiapkan pembayaran…' : 'Bayar Sekarang (Midtrans)'}
      </button>
      {err && <p className="mt-1.5 text-xs font-semibold text-rose-600">{err}</p>}
    </div>
  );
}
