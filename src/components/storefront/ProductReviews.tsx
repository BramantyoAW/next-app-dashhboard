'use client';
import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { gqlFetch } from '@/lib/graphqlClient';
import { getCustomerToken } from '@/lib/customer-token';

type ReviewItem = {
  id: string; rating: number; title?: string | null; comment?: string | null;
  reply?: string | null; replied_at?: string | null; is_verified_purchase: boolean;
  created_at?: string | null; customer?: { id: string; name?: string | null } | null;
};
type Summary = { avg: number; count: number; five: number; four: number; three: number; two: number; one: number };

const STAR = 5;

function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} dari 5 bintang`}>
      {Array.from({ length: STAR }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

export function ProductReviews({ hash, storeProductId, slug }: { hash: string; storeProductId: string; slug?: string }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await gqlFetch<{ storefrontProductReviews: { reviews: ReviewItem[]; summary: Summary } }>(
        `query($ws: String!, $id: ID) {
          storefrontProductReviews(web_store_slug: $ws, store_product_id: $id) {
            reviews { id rating title comment reply replied_at is_verified_purchase created_at customer { id name } }
            summary { avg count five four three two one }
          }
        }`,
        { ws: hash, id: storeProductId },
      );
      setReviews(data?.storefrontProductReviews?.reviews ?? []);
      setSummary(data?.storefrontProductReviews?.summary ?? null);
    } catch { /* senyap */ } finally { setLoaded(true); }
  }, [hash, storeProductId]);

  useEffect(() => { load(); setAuthed(!!getCustomerToken()); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFormMsg(null);
    try {
      const token = getCustomerToken();
      if (!token) { setAuthed(false); return; }
      await gqlFetch(
        `mutation($i: SubmitProductReviewInput!) { submitProductReview(input: $i) { id } }`,
        { i: { store_product_id: storeProductId, rating, title: title || null, comment } },
        token,
      );
      setTitle(''); setComment(''); setRating(5);
      setFormMsg('Terima kasih! Review Anda sudah terkirim.');
      await load();
    } catch (err: any) {
      setFormMsg(err?.message ? `Gagal: ${err.message}` : 'Gagal mengirim review.');
    } finally { setBusy(false); }
  }

  const avg = summary?.avg ?? 0;
  const total = summary?.count ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className="border-t" style={{ borderColor: 'var(--line, rgba(22,22,22,0.15))' }}>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>Ulasan Pembeli</h2>

        {/* Ringkasan + form */}
        <div className="mt-5 grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line, rgba(22,22,22,0.15))' }}>
            {summary ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">{avg.toLocaleString('id-ID')}</span>
                  <span className="pb-1 text-sm text-slate-500">/ 5</span>
                </div>
                <Stars rating={Math.round(avg)} className="mt-1" />
                <div className="mt-1 text-xs text-slate-500">{total} ulasan</div>
                <div className="mt-4 space-y-1.5">
                  {([5, 4, 3, 2, 1] as const).map((n) => (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-slate-500">{n}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct(summary[n === 5 ? 'five' : n === 4 ? 'four' : n === 3 ? 'three' : n === 2 ? 'two' : 'one'])}%` }} />
                      </div>
                      <span className="w-8 text-right text-slate-400">{summary[n === 5 ? 'five' : n === 4 ? 'four' : n === 3 ? 'three' : n === 2 ? 'two' : 'one']}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : loaded ? (
              <div className="text-sm text-slate-500">Belum ada ulasan.</div>
            ) : (
              <div className="text-sm text-slate-400">Memuat…</div>
            )}
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line, rgba(22,22,22,0.15))' }}>
            {authed ? (
              <form onSubmit={submit}>
                <h3 className="text-sm font-bold">Tulis ulasan</h3>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: STAR }).map((_, i) => (
                    <button key={i} type="button" aria-label={`${i + 1} bintang`} onClick={() => setRating(i + 1)}>
                      <Star className={`h-6 w-6 transition ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:fill-amber-200'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-slate-500">{rating}/5</span>
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul (opsional)"
                  maxLength={120}
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ceritakan pengalaman belanja Anda…"
                  required
                  maxLength={2000}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {formMsg && <div className="mt-2 text-xs font-semibold text-emerald-600">{formMsg}</div>}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-3 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'var(--brand, #161616)', color: 'var(--brand-contrast, #faf9f6)' }}
                >
                  {busy ? 'Mengirim…' : 'Kirim Ulasan'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-600">
                <Link href={`/storefront/${hash}/sign-in?next=${encodeURIComponent(`/storefront/${hash}/products/${slug ?? storeProductId}`)}`} className="font-bold underline">
                  Masuk
                </Link>{' '}
                untuk menulis ulasan.
              </p>
            )}
          </div>
        </div>

        {/* Daftar review */}
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--line, rgba(22,22,22,0.15))' }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--accent, #725b38)' }}>
                  {(r.customer?.name ?? 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold">{r.customer?.name ?? 'Pembeli'}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Stars rating={r.rating} />
                    {r.is_verified_purchase && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">✓ Pembelian Terverifikasi</span>}
                    {r.created_at && <span>{new Date(r.created_at).toLocaleDateString('id-ID')}</span>}
                  </div>
                </div>
              </div>
              {r.title && <div className="mt-2 text-sm font-bold">{r.title}</div>}
              {r.comment && <p className="mt-1 text-sm leading-relaxed text-slate-700">{r.comment}</p>}
              {r.reply && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Balasan toko</div>
                  <p className="mt-1 text-slate-700">{r.reply}</p>
                </div>
              )}
            </div>
          ))}
          {loaded && reviews.length === 0 && <p className="text-sm text-slate-500">Belum ada ulasan untuk produk ini. Jadilah yang pertama!</p>}
        </div>
      </div>
    </section>
  );
}
