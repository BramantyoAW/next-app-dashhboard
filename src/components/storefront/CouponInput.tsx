'use client';

import { useEffect, useState } from 'react';
import { validateCoupon } from '@/graphql/query/webstore';
import { formatIDR } from '@/lib/cart';
import { Tag, Loader2, X, BadgeCheck } from 'lucide-react';

export type CouponAppliedInfo = {
  code: string;
  discount: number;
};

type Props = {
  hash: string;
  subtotal: number;
  onCouponApplied: (info: CouponAppliedInfo | null) => void;
};

export function CouponInput({ hash, subtotal, onCouponApplied }: Props) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<CouponAppliedInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touchedCode, setTouchedCode] = useState<string | null>(null);

  // If the subtotal drops below a threshold and a coupon is applied, revalidate.
  useEffect(() => {
    if (!applied || applied.code !== touchedCode) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    validateCoupon(hash, touchedCode, subtotal)
      .then((res) => {
        if (cancelled) return;
        const v = res.validateCoupon;
        if (v.valid && v.discount > 0) {
          setApplied({ code: touchedCode, discount: v.discount });
          onCouponApplied({ code: touchedCode, discount: v.discount });
        } else {
          setApplied(null);
          onCouponApplied(null);
          if (v.error) setError(v.error);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function apply() {
    const clean = code.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    setTouchedCode(clean);
    try {
      const res = await validateCoupon(hash, clean, subtotal);
      const v = res.validateCoupon;
      if (v.valid && v.discount > 0) {
        const info = { code: clean, discount: v.discount };
        setApplied(info);
        setCode('');
        onCouponApplied(info);
      } else {
        setApplied(null);
        onCouponApplied(null);
        setError(v.error ?? 'Kupon tidak valid atau tidak dapat digunakan pada pesanan ini.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Gagal memvalidasi kupon. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setApplied(null);
    setError(null);
    setCode('');
    onCouponApplied(null);
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="text-lg font-semibold">Kupon Diskon</h2>

      {applied ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <BadgeCheck size={16} className="shrink-0 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm font-bold text-emerald-700">{applied.code}</span>
            <span className="ml-2 text-sm text-emerald-700">
              -{formatIDR(applied.discount)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-100 transition-colors"
            aria-label="Hapus kupon"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm uppercase tracking-wide"
              placeholder="Masukkan kode kupon"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  apply();
                }
              }}
              disabled={busy}
            />
          </div>
          <button
            type="button"
            onClick={apply}
            disabled={busy || !code.trim()}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--brand)' }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Pakai'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}