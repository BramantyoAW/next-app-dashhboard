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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-extrabold tracking-tight text-slate-900">Kupon Diskon</h2>

      {applied ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <BadgeCheck size={16} className="shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-sm font-bold text-emerald-700">{applied.code}</span>
            <span className="ml-2 text-sm text-emerald-700">-{formatIDR(applied.discount)}</span>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="shrink-0 rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-100"
            aria-label="Hapus kupon"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-8 pr-3 text-sm uppercase tracking-wide outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
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
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Pakai'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
