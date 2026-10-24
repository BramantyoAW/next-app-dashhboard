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

const STATUS_LABEL: Record<string, { text: string; cls: string; tone?: 'ok' | 'warn' | 'bad' | 'info' }> = {
  sending: { text: 'Mengirim…', cls: 'ds-badge', tone: 'info' },
  done: { text: 'Selesai', cls: 'ds-badge', tone: 'ok' },
  failed: { text: 'Gagal', cls: 'ds-badge', tone: 'bad' },
  cancelled: { text: 'Dibatalkan', cls: 'ds-badge' },
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
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Broadcast Promo</h1>
          <p className="ds-small mt-1">Kirim email promo ke semua pelanggan terdaftar toko Anda.</p>
        </div>
      </div>

      {error && <div className="ds-alert mt-4" data-tone="bad">{error}</div>}
      {success && <div className="ds-alert mt-4" data-tone="ok">{success}</div>}

      {/* Form */}
      <div className="ds-card mt-6 p-6">
        <div className="flex items-center justify-between">
          <div className="ds-h2 flex items-center gap-2">
            <Megaphone className="h-4 w-4 ds-icon-muted" />
            Email baru
          </div>
          {recipientCount !== null && (
            <span className="ds-badge" data-tone="info">
              {recipientCount} pelanggan akan menerima
            </span>
          )}
        </div>

        <label className="ds-label mt-4 uppercase tracking-wide">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={255}
          placeholder="Contoh: Promo Spesial — Diskon 20%!"
          className="ds-input mt-1"
        />

        <label className="ds-label mt-4 uppercase tracking-wide">Pesan</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder={'Halo {nama}, nikmati promo spesial kami…'}
          className="ds-textarea mt-1"
        />
        <div className="ds-caption mt-1 text-right">{message.length}/5000</div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={send}
            disabled={sending || !token}
            className="ds-btn"
            data-variant="primary"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Broadcast
          </button>
        </div>
      </div>

      {/* Riwayat */}
      <h2 className="ds-h1 mt-10">Riwayat Broadcast</h2>
      {broadcasts.length === 0 ? (
        <div className="ds-note mt-4">
          Belum ada broadcast.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {broadcasts.map((b) => {
            const st = STATUS_LABEL[b.status] ?? { text: b.status, cls: 'ds-badge', tone: 'info' as const };
            const Icon = b.status === 'done' ? CheckCircle2 : b.status === 'failed' ? XCircle : Clock;
            return (
              <div key={b.id} className="ds-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ds-body truncate font-semibold">{b.subject}</div>
                    <div className="ds-small mt-0.5 line-clamp-2">{b.message}</div>
                    {b.created_at && (
                      <div className="ds-caption mt-1">{new Date(b.created_at).toLocaleString('id-ID')}</div>
                    )}
                  </div>
                  <span className={`shrink-0 ${st.cls}`} data-tone={st.tone}>
                    <Icon className="h-3.5 w-3.5" />
                    {st.text}
                  </span>
                </div>
                <div className="ds-caption mt-3 flex flex-wrap gap-4">
                  <span>Penerima: <b className="ds-num">{b.total_recipients}</b></span>
                  <span className="text-emerald-600">Terkirim: <b className="ds-num">{b.sent_count}</b></span>
                  {b.failed_count > 0 && <span className="text-rose-600">Gagal: <b className="ds-num">{b.failed_count}</b></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
