'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { gqlFetch } from '@/lib/graphqlClient';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';

type Broadcast = {
  id: string; subject: string; message: string; status: string;
  total_recipients: number; sent_count: number; failed_count: number;
  created_at?: string | null; sent_at?: string | null;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  sending: { text: 'Mengirim…', cls: 'bg-blue-100 text-blue-700' },
  done: { text: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { text: 'Gagal', cls: 'bg-rose-100 text-rose-700' },
  cancelled: { text: 'Dibatalkan', cls: 'bg-slate-200 text-slate-600' },
};

export default function OwnerBroadcastPage() {
  const [token, setToken] = useState('');
  const [storeId, setStoreId] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (!t) return;
    const payload = decodeJwt(t);
    const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
    if (!ownerId) return;
    getWebStoreByOwner(ownerId, t).then((ws) => {
      if (ws.webStoreByOwner?.id) setStoreId(String(ws.webStoreByOwner.id));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const data = await gqlFetch<{ emailBroadcasts: Broadcast[] }>(
        `query($ws: ID!) { emailBroadcasts(web_store_id: $ws) { id subject message status total_recipients sent_count failed_count created_at sent_at } }`,
        { ws: storeId }, token,
      );
      setBroadcasts(data?.emailBroadcasts ?? []);
      const anySending = (data?.emailBroadcasts ?? []).some(b => b.status === 'sending');
      if (!anySending && timer.current) { clearInterval(timer.current); timer.current = null; }
    } catch { /* senyap */ }
  }, [token, storeId]);

  const loadRecipients = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const data = await gqlFetch<{ emailBroadcastRecipientCount: number }>(
        `query($ws: ID!) { emailBroadcastRecipientCount(web_store_id: $ws) }`,
        { ws: storeId }, token,
      );
      setRecipientCount(data?.emailBroadcastRecipientCount ?? 0);
    } catch { /* senyap */ }
  }, [token, storeId]);

  useEffect(() => {
    if (!token || !storeId) return;
    load(); loadRecipients();
  }, [load, loadRecipients, token, storeId]);

  // Poll selama ada broadcast berstatus sending.
  useEffect(() => {
    if (broadcasts.some(b => b.status === 'sending')) {
      if (!timer.current) {
        timer.current = setInterval(() => load(), 4000);
      }
    } else if (timer.current) {
      clearInterval(timer.current); timer.current = null;
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [broadcasts, load]);

  async function send() {
    if (!token || !storeId) return;
    const subj = subject.trim(), msg = message.trim();
    if (!subj || !msg) { setError('Subject dan pesan wajib diisi.'); return; }
    setSending(true); setError(null); setSuccess(null);
    try {
      await gqlFetch(
        `mutation($ws: ID!, $s: String!, $m: String!) {
          sendEmailBroadcast(input: { web_store_id: $ws, subject: $s, message: $m }) { id }
        }`,
        { ws: storeId, s: subj, m: msg }, token,
      );
      setSubject(''); setMessage('');
      setSuccess(`Broadcast dikirim ke ${recipientCount ?? '?'} pelanggan.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Gagal mengirim broadcast.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Broadcast Promo</h1>
      <p className="mt-1 text-sm text-slate-500">Kirim email promo ke semua pelanggan terdaftar toko Anda.</p>

      {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {success && <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>}

      {/* Form */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Megaphone className="h-4 w-4 text-slate-400" />
            Email baru
          </div>
          {recipientCount !== null && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {recipientCount} pelanggan akan menerima
            </span>
          )}
        </div>

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={255}
          placeholder="Contoh: Promo Spesial — Diskon 20%!"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Pesan</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder={'Halo {nama}, nikmati promo spesial kami…'}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-slate-400">{message.length}/5000</div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={send}
            disabled={sending || !token}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Broadcast
          </button>
        </div>
      </div>

      {/* Riwayat */}
      <h2 className="mt-10 text-lg font-bold text-slate-900">Riwayat Broadcast</h2>
      {broadcasts.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Belum ada broadcast.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {broadcasts.map((b) => {
            const st = STATUS_LABEL[b.status] ?? { text: b.status, cls: 'bg-slate-100 text-slate-600' };
            const Icon = b.status === 'done' ? CheckCircle2 : b.status === 'failed' ? XCircle : Clock;
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{b.subject}</div>
                    <div className="mt-0.5 line-clamp-2 text-sm text-slate-500">{b.message}</div>
                    {b.created_at && (
                      <div className="mt-1 text-xs text-slate-400">{new Date(b.created_at).toLocaleString('id-ID')}</div>
                    )}
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {st.text}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Penerima: <b className="text-slate-700">{b.total_recipients}</b></span>
                  <span className="text-emerald-600">Terkirim: <b>{b.sent_count}</b></span>
                  {b.failed_count > 0 && <span className="text-rose-600">Gagal: <b>{b.failed_count}</b></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
