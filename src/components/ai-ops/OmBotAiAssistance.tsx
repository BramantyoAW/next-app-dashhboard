'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, ChevronDown, Loader2, Send, Sparkles, Store, Trash2, X } from 'lucide-react';
import { myStoresService, type MyStore } from '@/graphql/query/myStores';

/**
 * "OmBot AI Assistance" — panel melayang untuk owner di halaman /dashboard/*.
 *
 * Terpisah dari "Design with OmBot AI" (yang mengurus halaman/tema web store).
 * Panel ini menjawab pertanyaan DATA TOKO lewat tool calling di BE
 * (/api/ai-ops/chat), dan aksi tulis (stok/harga/order) muncul sebagai kartu
 * konfirmasi yang harus diklik owner sebelum dijalankan.
 */

type Role = 'user' | 'assistant' | 'system';

type PendingAction = {
  token: string;
  /** confirm = aksi tulis (kirim ke /api/ai-ops/execute); switch_store = pilih toko aktif. */
  kind?: 'confirm' | 'switch_store';
  tool: string;
  title: string;
  detail: string;
  preview: { label: string; from: string; to: string }[];
  options?: { id: number; nama: string }[];
};

type Message = {
  id: string;
  role: Role;
  text: string;
  actions?: PendingAction[];
  actionState?: 'idle' | 'running' | 'done' | 'failed';
};

const CONTOH: { grup: string; ketik: string }[] = [
  { grup: 'Cek stok', ketik: 'stok es teh berapa?' },
  { grup: 'Stok menipis', ketik: 'stok di bawah 20 ada apa aja?' },
  { grup: 'Stok habis', ketik: 'produk apa saja yang stoknya habis?' },
  { grup: 'Cek harga', ketik: 'harga es teh jumbo?' },
  { grup: 'Tambah stok', ketik: 'tambah stok bakso jumbo 10' },
  { grup: 'Tambah stok', ketik: 'tambah stok es teh manis jadi 100' },
  { grup: 'Ubah harga', ketik: 'ubah harga es teh jadi 12000' },
  { grup: 'Buat order', ketik: 'order 2 es teh + 1 tempe mendoan' },
  { grup: 'Laporan omset', ketik: 'laporan omset minggu ini' },
  { grup: 'Order per periode', ketik: 'ada berapa order 1-7 September?' },
  { grup: 'Riwayat stok', ketik: 'kenapa stok es teh berkurang?' },
  { grup: 'Stok semua outlet', ketik: 'total stok es teh di semua toko' },
  { grup: 'Detail produk', ketik: 'detail produk bakso reguler' },
  { grup: 'Daftar toko', ketik: 'toko saya ada berapa?' },
  { grup: 'Pindah toko', ketik: 'ganti toko' },
];

// NEXT_PUBLIC_* sudah di-inline saat build untuk komponen client.
function backendBase() {
  return process.env.NEXT_PUBLIC_BACKEND_BASE?.trim() || 'http://localhost:8000';
}

const uid = () => Math.random().toString(36).slice(2);

export default function OmBotAiAssistance() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [stores, setStores] = useState<MyStore[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  // Saldo AI Point habis: bedakan dari kegagalan teknis agar bisa tampilkan
  // tautan top-up, bukan pesan error merah.
  const [isPointHabis, setIsPointHabis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Muat daftar toko (untuk pemilih toko aktif) sekali saat panel dibuka.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    myStoresService(token)
      .then((res) => {
        const list = res?.myStores ?? [];
        setStores(list);
        if (list.length) {
          const saved = Number(localStorage.getItem('aiops_store_id') || 0);
          const valid = list.some((s) => s.id === saved);
          setStoreId(valid ? saved : list[0].id);
        }
      })
      .catch(() => {});
  }, [open]);

  // Riwayat & toko aktif disimpan per browser (tanpa tabel baru).
  useEffect(() => {
    if (!open) return;
    const raw = localStorage.getItem('aiops_history');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch {}
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem('aiops_history', JSON.stringify(messages.slice(-40)));
  }, [messages, open]);

  useEffect(() => {
    if (storeId) localStorage.setItem('aiops_store_id', String(storeId));
  }, [storeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status, busy]);

  const storeName = useMemo(
    () => stores.find((s) => s.id === storeId)?.name ?? 'Toko',
    [stores, storeId],
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;

      const token = localStorage.getItem('token') || '';
      if (!token) {
        setMessages((m) => [...m, { id: uid(), role: 'system', text: 'Sesi berakhir. Silakan login ulang.' }]);
        return;
      }

      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.text }));

      setMessages((m) => [...m, { id: uid(), role: 'user', text: message }]);
      setInput('');
      setBusy(true);
      setIsPointHabis(false);
      setStatus('Menghubungi OmBot AI…');

      try {
        const res = await fetch(`${backendBase()}/api/ai-ops/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message, store_id: storeId, history }),
        });

        if (res.status === 401) {
          throw new Error('Sesi kamu sudah berakhir. Silakan login ulang lalu buka panel ini lagi.');
        }
        if (!res.ok || !res.body) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Gagal menghubungi AI (HTTP ${res.status}) ${txt.slice(0, 120)}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let result: { reply: string; actions: PendingAction[] } | null = null;
        let errorMsg = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);

            let event = 'message';
            const dataLines: string[] = [];
            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) event = line.slice(7).trim();
              else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
            }
            if (!dataLines.length) continue;

            let data: {
              message?: string;
              reply?: string;
              actions?: PendingAction[];
              code?: string;
              saldo?: number;
              ai_points?: number;
            } | null = null;
            try {
              data = JSON.parse(dataLines.join('\n'));
            } catch {
              continue;
            }
            if (!data) continue;

            if (event === 'status') {
              setStatus(String(data.message ?? ''));
              // Saldo terbaru dikirim backend tiap kali poin dipotong — teruskan
              // ke header agar angka AI Point turun real time, tanpa refresh.
              if (typeof data.ai_points === 'number') {
                window.dispatchEvent(
                  new CustomEvent('aiPointsChanged', { detail: { aiPoints: data.ai_points } }),
                );
              }
            }
            else if (event === 'result') result = { reply: String(data.reply ?? ''), actions: data.actions ?? [] };
            else if (event === 'error') {
              errorMsg = String(data.message ?? 'AI gagal menjawab.');
              // Saldo AI Point habis bukan kegagalan teknis — tandai supaya
              // gelembung pesan bisa menampilkan tautan top-up.
              if (data.code === 'AI_POINT_HABIS') {
                setIsPointHabis(true);
                if (typeof data.saldo === 'number') {
                  window.dispatchEvent(
                    new CustomEvent('aiPointsChanged', { detail: { aiPoints: data.saldo } }),
                  );
                }
              }
            }
          }
        }

        if (errorMsg) throw new Error(errorMsg);
        if (!result) throw new Error('AI tidak mengembalikan jawaban.');

        const ok = result;
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            text: ok.reply || '(tanpa jawaban)',
            actions: ok.actions,
            actionState: 'idle',
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
        setMessages((m) => [...m, { id: uid(), role: 'system', text: msg }]);
      } finally {
        setBusy(false);
        setStatus('');
      }
    },
    [busy, messages, storeId],
  );

  const confirmAction = useCallback(
    async (msgId: string, action: PendingAction) => {
      const token = localStorage.getItem('token') || '';
      setMessages((m) =>
        m.map((x) => (x.id === msgId ? { ...x, actionState: 'running' } : x)),
      );
      try {
        const res = await fetch(`${backendBase()}/api/ai-ops/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: action.token }),
        });
        const data = await res.json();
        setMessages((m) =>
          m.map((x) => (x.id === msgId ? { ...x, actionState: data?.ok ? 'done' : 'failed' } : x)),
        );
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'system',
            text: (data?.ok ? '✅ ' : '⚠️ ') + (data?.message ?? 'Selesai.'),
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setMessages((m) =>
          m.map((x) => (x.id === msgId ? { ...x, actionState: 'failed' } : x)),
        );
        setMessages((m) => [...m, { id: uid(), role: 'system', text: 'Gagal: ' + msg }]);
      }
    },
    [],
  );

  return (
    <>
      {/* Tombol melayang */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:scale-105"
          aria-label="Buka OmBot AI Assistance"
        >
          <Sparkles size={18} />
          <span className="hidden sm:inline">OmBot AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-40 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:h-[620px] sm:w-[420px] sm:rounded-2xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <Bot size={20} />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">OmBot AI Assistance</div>
                {/* Pemilih toko aktif — pengganti "ganti toko" */}
                <button
                  onClick={() => setStoreOpen((v) => !v)}
                  className="mt-0.5 flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-medium hover:bg-white/25"
                  disabled={stores.length < 2}
                >
                  <Store size={11} />
                  <span className="max-w-[180px] truncate">{storeName}</span>
                  {stores.length > 1 && <ChevronDown size={11} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="rounded-lg p-1.5 hover:bg-white/15"
                title="Contoh perintah"
              >
                <Sparkles size={16} />
              </button>
              <button
                onClick={() => {
                  setMessages([]);
                  localStorage.removeItem('aiops_history');
                }}
                className="rounded-lg p-1.5 hover:bg-white/15"
                title="Hapus riwayat"
              >
                <Trash2 size={16} />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" title="Tutup">
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Daftar toko */}
          {storeOpen && stores.length > 1 && (
            <div className="border-b border-slate-100 bg-slate-50 p-2">
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStoreId(s.id);
                    setStoreOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white ${
                    s.id === storeId ? 'bg-white font-bold text-blue-700' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.id === storeId && <Check size={13} />}
                </button>
              ))}
            </div>
          )}

          {/* Contoh perintah */}
          {showHelp && (
            <div className="max-h-52 overflow-y-auto border-b border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Mau ngapain — klik contoh
              </div>
              <div className="space-y-1.5">
                {CONTOH.map((c) => (
                  <button
                    key={c.ketik}
                    onClick={() => {
                      setShowHelp(false);
                      send(c.ketik);
                    }}
                    className="flex w-full items-baseline gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-[11px] hover:ring-1 hover:ring-blue-200"
                  >
                    <span className="min-w-[110px] shrink-0 font-bold text-slate-700">{c.grup}</span>
                    <span className="text-slate-500">“{c.ketik}”</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Percakapan */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-3">
            {messages.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                <div className="mb-1 font-bold text-slate-700">Halo! Saya OmBot AI 👋</div>
                Tanya apa saja soal tokomu — stok, harga, order, omzet, riwayat stok.
                <button
                  onClick={() => setShowHelp(true)}
                  className="mt-2 font-bold text-blue-600 hover:underline"
                >
                  Lihat contoh perintah →
                </button>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id}>
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-xs text-white'
                      : m.role === 'assistant'
                        ? 'w-fit max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700'
                        : 'mx-auto w-fit max-w-[92%] rounded-lg bg-slate-100 px-3 py-1.5 text-center text-[11px] font-medium text-slate-600'
                  }
                >
                  {m.text}
                </div>

                {/* Saldo AI Point habis: arahkan ke halaman top-up */}
                {m.role === 'system' && isPointHabis && m === messages[messages.length - 1] && (
                  <div className="mt-2 flex justify-center">
                    <a
                      href="/dashboard/points"
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-violet-700"
                    >
                      Top-up AI Point
                    </a>
                  </div>
                )}

                {/* Kartu konfirmasi aksi tulis / pilihan toko */}
                {!!m.actions?.length && (
                  <div className="mt-2 space-y-2">
                    {m.actions.map((a) => (
                      <div key={a.token || a.tool + a.title} className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
                        <div className="border-b border-amber-200 px-3 py-2">
                          <div className="text-xs font-bold text-amber-900">{a.title}</div>
                          <div className="text-[11px] text-amber-700">{a.detail}</div>
                        </div>

                        {/* Pilihan toko aktif */}
                        {a.kind === 'switch_store' ? (
                          <div className="space-y-1 p-2">
                            {(a.options ?? []).map((o) => (
                              <button
                                key={o.id}
                                onClick={() => {
                                  setStoreId(o.id);
                                  setMessages((prev) => [
                                    ...prev,
                                    { id: uid(), role: 'system', text: `Toko aktif: ${o.nama}` },
                                  ]);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-[11px] hover:ring-1 hover:ring-amber-300 ${
                                  o.id === storeId ? 'font-bold text-amber-800 ring-1 ring-amber-300' : 'text-slate-700'
                                }`}
                              >
                                <span className="truncate">{o.nama}</span>
                                {o.id === storeId && <Check size={13} />}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <>
                            {!!a.preview?.length && (
                              <div className="space-y-1 px-3 py-2">
                                {a.preview.map((p, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="truncate text-slate-600">{p.label}</span>
                                    <span className="shrink-0 font-mono text-slate-500">
                                      {p.from} <span className="text-amber-600">→</span>{' '}
                                      <b className="text-slate-800">{p.to}</b>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 border-t border-amber-200 px-3 py-2">
                              <button
                                disabled={m.actionState !== 'idle'}
                                onClick={() => confirmAction(m.id, a)}
                                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                              >
                                {m.actionState === 'running' && <Loader2 size={12} className="animate-spin" />}
                                {m.actionState === 'done'
                                  ? 'Sudah dijalankan'
                                  : m.actionState === 'failed'
                                    ? 'Gagal dijalankan'
                                    : 'Ya, jalankan'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <Loader2 size={13} className="animate-spin" />
                {status || 'AI mengetik…'}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya stok, harga, order, omzet…"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40"
              aria-label="Kirim"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
