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
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Ulasan Produk</h1>
          <p className="mt-1 ds-small">Kelola ulasan pelanggan untuk produk toko Anda.</p>
        </div>
      </div>

      {msg && <div className="mt-4 ds-alert" data-tone="bad">{msg}</div>}

      {reviews.length === 0 ? (
        <div className="mt-8 ds-card ds-empty ds-small">Belum ada ulasan produk.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="ds-card ds-card-pad">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--ds-fg)', color: 'var(--ds-primary-fg)' }}>
                    {(r.customer?.name ?? 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="ds-h2">{r.customer?.name ?? 'Pembeli'}</div>
                    <div className="flex items-center gap-1 ds-caption">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'ds-icon-muted'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.is_verified_purchase && <span className="ds-badge" data-tone="ok"><BadgeCheck className="mr-1 inline h-3.5 w-3.5" />Verified</span>}
                  <span className="ds-badge" data-tone={r.status === 'approved' ? 'ok' : 'warn'}>
                    {r.status === 'approved' ? 'Tampil' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="mt-2 ds-caption">
                <span className="font-semibold">{r.product?.name ?? r.product?.sku ?? 'Produk'}</span>
                {r.created_at && <> · {new Date(r.created_at).toLocaleDateString('id-ID')}</>}
              </div>
              {r.title && <div className="mt-2 ds-h2">{r.title}</div>}
              {r.comment && <p className="mt-1 ds-body">{r.comment}</p>}

              {r.reply && (
                <div className="mt-3 ds-well">
                  <div className="ds-section-label">Balasan toko {r.replied_at ? <Clock className="inline h-3 w-3" /> : ''}</div>
                  <p className="mt-1 ds-body">{r.reply}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {replyFor === r.id ? (
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Tulis balasan…" className="flex-1 ds-textarea" />
                    <div className="flex gap-2">
                      <button onClick={() => sendReply(r)} disabled={busy} className="ds-btn" data-variant="primary">
                        Kirim
                      </button>
                      <button onClick={() => { setReplyFor(null); setReplyText(''); }} className="ds-btn" data-variant="secondary">Batal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setReplyFor(r.id); setReplyText(r.reply ?? ''); }} className="ds-btn" data-variant="secondary">
                      <Reply className="h-4 w-4" /> {r.reply ? 'Ubah Balasan' : 'Balas'}
                    </button>
                    {r.status === 'pending' && (
                      <button onClick={() => setStatus(r, 'approved')} className="ds-btn" data-variant="primary">Setujui</button>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => setStatus(r, 'pending')} className="ds-btn" data-variant="secondary">Tarik</button>
                    )}
                    <button onClick={() => del(r)} disabled={busy} className="ds-btn" data-variant="danger">
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