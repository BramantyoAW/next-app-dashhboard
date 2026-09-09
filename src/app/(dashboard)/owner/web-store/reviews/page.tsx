'use client';
import { useCallback, useEffect, useState } from 'react';
import { Reply, Trash2, BadgeCheck, Clock, Star } from 'lucide-react';
import { gqlFetch } from '@/lib/graphqlClient';

type Review = {
  id: string; rating: number; title?: string | null; comment?: string | null;
  reply?: string | null; replied_at?: string | null; is_verified_purchase: boolean;
  status: string; created_at?: string | null;
  customer?: { id: string; name?: string | null } | null;
  product?: { id: string; name?: string | null; sku?: string | null } | null;
};

export default function OwnerReviewsPage() {
  const [token, setToken] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem('token') || ''); }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await gqlFetch<{ ownerProductReviews: Review[] }>(
        `query { ownerProductReviews { id rating title comment reply replied_at is_verified_purchase status created_at customer { id name } product { id name sku } } }`,
        {},
        token,
      );
      setReviews(data?.ownerProductReviews ?? []);
    } catch { /* senyap */ }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function sendReply(r: Review) {
    if (!token) return;
    const t = replyText.trim();
    if (!t) return;
    setBusy(true); setMsg(null);
    try {
      await gqlFetch(`mutation($id: ID!, $r: String!) { replyOwnerReview(review_id: $id, reply: $r) { id } }`, { id: r.id, r: t }, token);
      setReplyFor(null); setReplyText('');
      await load();
    } catch (e: any) { setMsg(e?.message || 'Gagal membalas.'); } finally { setBusy(false); }
  }

  async function setStatus(r: Review, status: string) {
    if (!token) return;
    setBusy(true);
    try {
      await gqlFetch(`mutation($id: ID!, $s: String!) { setOwnerReviewStatus(review_id: $id, status: $s) { id } }`, { id: r.id, s: status }, token);
      await load();
    } catch (e: any) { setMsg(e?.message || 'Gagal memperbarui status.'); } finally { setBusy(false); }
  }

  async function del(r: Review) {
    if (!token) return;
    if (!confirm('Hapus ulasan ini?')) return;
    setBusy(true);
    try {
      await gqlFetch(`mutation($id: ID!) { deleteOwnerReview(review_id: $id) }`, { id: r.id }, token);
      await load();
    } catch (e: any) { setMsg(e?.message || 'Gagal menghapus.'); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Ulasan Produk</h1>
      <p className="mt-1 text-sm text-slate-500">Kelola ulasan pelanggan untuk produk toko Anda.</p>

      {msg && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{msg}</div>}

      {reviews.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Belum ada ulasan produk.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {(r.customer?.name ?? 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{r.customer?.name ?? 'Pembeli'}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.is_verified_purchase && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"><BadgeCheck className="mr-1 inline h-3.5 w-3.5" />Verified</span>}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'approved' ? 'Tampil' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-600">{r.product?.name ?? r.product?.sku ?? 'Produk'}</span>
                {r.created_at && <> · {new Date(r.created_at).toLocaleDateString('id-ID')}</>}
              </div>
              {r.title && <div className="mt-2 text-sm font-bold text-slate-800">{r.title}</div>}
              {r.comment && <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.comment}</p>}

              {r.reply && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Balasan toko {r.replied_at ? <Clock className="inline h-3 w-3" /> : ''}</div>
                  <p className="mt-1 text-slate-700">{r.reply}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {replyFor === r.id ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Tulis balasan…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => sendReply(r)} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        Kirim
                      </button>
                      <button onClick={() => { setReplyFor(null); setReplyText(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Batal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setReplyFor(r.id); setReplyText(r.reply ?? ''); }} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Reply className="h-4 w-4" /> {r.reply ? 'Ubah Balasan' : 'Balas'}
                    </button>
                    {r.status === 'pending' && (
                      <button onClick={() => setStatus(r, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">Setujui</button>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => setStatus(r, 'pending')} className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700">Tarik</button>
                    )}
                    <button onClick={() => del(r)} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}