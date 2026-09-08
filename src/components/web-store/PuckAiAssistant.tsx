'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Clock, ImagePlus, Loader2, Maximize2, Minimize2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { persistAiMessage, type AiAssistantResult } from '@/graphql/mutation/aiAssistant';
import { getAiChatHistory } from '@/graphql/query/aiAssistant';
import { streamAskAi } from '@/lib/streamAskAi';
import { AiChangePreview, changedBlocksOf } from '@/components/web-store/AiChangePreview';
import type { Data } from '@puckeditor/core';

type PuckChange = AiAssistantResult['changes'][number];
type PuckBlock = { id?: string; type?: string; props?: Record<string, unknown>; style?: Record<string, unknown>; [k: string]: unknown };

const SCOPED_KEYS = ['css', 'js'];

function freshId(): string {
  return `blk_ai_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function normalizeNewBlock(raw: PuckBlock): PuckBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = typeof raw.type === 'string' ? raw.type : '';
  if (!type) return null;
  const props = raw.props && typeof raw.props === 'object' && !Array.isArray(raw.props) ? { ...raw.props } : {};
  // Id blok Puck hidup di props.id (format Puck). Jaga konsisten.
  const id = typeof raw.id === 'string' && raw.id ? raw.id : typeof props.id === 'string' && props.id ? props.id : freshId();
  return {
    ...raw,
    id,
    props: { ...props, id },
    style: raw.style && typeof raw.style === 'object' && !Array.isArray(raw.style) ? { ...raw.style } : undefined,
  };
}

/** Terapkan ops block_ops dari AI ke data Puck. Kembalikan data baru + jumlah terpakai. */
export function applyBlockOpsToPuck(data: Data, slug: string, ops: { op: string; id?: string; ids?: string[]; props?: Record<string, unknown>; style?: Record<string, unknown>; blocks?: PuckBlock[] }[]): { next: Data; used: number } {
  const content = (Array.isArray(data?.content) ? data.content : []).filter(Boolean);
  const structural: PuckBlock[] = content.map((b) => ({ ...(b as PuckBlock) }));

  const findId = (id?: string) => structural.find((b) => b.props?.id === id || b.id === id);

  let used = 0;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    switch (op.op) {
      case 'append_blocks': {
        const blocks = (Array.isArray(op.blocks) ? op.blocks : []).map(normalizeNewBlock).filter((b): b is PuckBlock => !!b);
        if (blocks.length === 0) break;
        structural.push(...blocks);
        used++;
        break;
      }
      case 'prepend_blocks': {
        const blocks = (Array.isArray(op.blocks) ? op.blocks : []).map(normalizeNewBlock).filter((b): b is PuckBlock => !!b);
        if (blocks.length === 0) break;
        structural.unshift(...blocks);
        used++;
        break;
      }
      case 'replace_blocks': {
        const blocks = (Array.isArray(op.blocks) ? op.blocks : []).map(normalizeNewBlock).filter((b): b is PuckBlock => !!b);
        if (blocks.length === 0) break;
        structural.length = 0;
        structural.push(...blocks);
        used++;
        break;
      }
      case 'update_block': {
        const target = findId(op.id);
        if (!target) break;
        const props = op.props && typeof op.props === 'object' && !Array.isArray(op.props) ? op.props : null;
        if (props) {
          const { id, ...rest } = props as Record<string, unknown>;
          target.props = { ...(target.props ?? {}), ...rest, id: target.props?.id ?? (id as string) ?? freshId() };
        }
        if (op.style && typeof op.style === 'object' && !Array.isArray(op.style)) {
          target.style = { ...(target.style ?? {}), ...op.style };
        }
        used++;
        break;
      }
      case 'remove_block': {
        const pos = structural.findIndex((b) => b.props?.id === op.id || b.id === op.id);
        if (pos === -1) break;
        structural.splice(pos, 1);
        used++;
        break;
      }
      case 'reorder_blocks': {
        if (!Array.isArray(op.ids) || op.ids.length === 0) break;
        const map = new Map(structural.map((b) => [b.props?.id ?? b.id, b]));
        const ordered: PuckBlock[] = [];
        for (const id of op.ids) {
          const b = map.get(String(id));
          if (b) ordered.push(b);
        }
        if (ordered.length === 0) break;
        const seen = new Set(ordered.map((b) => b.props?.id ?? b.id));
        for (const b of structural) if (!seen.has(b.props?.id ?? b.id)) ordered.push(b);
        structural.length = 0;
        structural.push(...ordered);
        used++;
        break;
      }
    }
  }

  return { next: { ...data, content: structural } as Data, used };
}

export function PuckAiAssistant({
  token,
  webStoreId,
  pageSlug,
  pageTitle,
  data,
  context,
  onApply,
  onClose,
}: {
  token: string;
  webStoreId?: string | null;
  pageSlug: string;
  pageTitle?: string | null;
  data: Data | null;
  context: unknown;
  onApply: (changes: PuckChange[]) => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<{ preview: string; data: string }[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; result?: AiAssistantResult; history?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiBusyLabel, setAiBusyLabel] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirming, setConfirming] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const greeting = `Halo! Saya AI desain untuk halaman **${pageTitle ?? pageSlug}**. Ceritakan perubahan yang kamu mau, atau unggah screenshot referensi — nanti saya bantu ubah blok halaman ini.`;
    if (!webStoreId) {
      setMessages([{ role: 'assistant', text: greeting }]);
      return;
    }
    setHistoryLoading(true);
    getAiChatHistory(token, webStoreId)
      .then((res) => {
        const saved = (res.aiChatHistory?.messages ?? [])
          .filter((m) => m.content && m.content.trim() !== '')
          .map((m) => {
            const base = { role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', text: m.content, history: true as const };
            // Pesan assistant lama yang punya meta.changes → rekonstruksi
            // `result` utk preview saja — TANPA tombol Terapkan (lihat render):
            // usulan lama bisa menarget id/kondisi yang sudah berubah, jadi
            // menerapkannya ke halaman sekarang berisiko & terasa "tak berubah".
            if (m.role !== 'user' && Array.isArray(m.meta?.changes) && m.meta!.changes!.length > 0) {
              return {
                ...base,
                result: {
                  reply: m.content,
                  language: 'id',
                  needs_clarification: false,
                  clarification_question: null,
                  changes: m.meta!.changes as AiAssistantResult['changes'],
                  warnings: [],
                },
              };
            }
            return base;
          });
        setMessages([{ role: 'assistant', text: greeting }, ...saved]);
      })
      .catch(() => setMessages([{ role: 'assistant', text: greeting }]))
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageSlug, pageTitle, webStoreId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - images.length);
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 6 * 1024 * 1024) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        setImages((prev) => (prev.length >= 3 ? prev : [...prev, { preview: dataUrl, data: dataUrl }]));
      };
      reader.readAsDataURL(f);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  /** Dukung paste (Ctrl/Cmd+V) gambar langsung ke kolom chat. */
  function onPasteImage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgItem = items.find((it) => it.type.startsWith('image/'));
    if (!imgItem) return; // bukan gambar → biarkan paste teks normal
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file || file.size > 6 * 1024 * 1024 || images.length >= 3) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImages((prev) => (prev.length >= 3 ? prev : [...prev, { preview: dataUrl, data: dataUrl }]));
    };
    reader.readAsDataURL(file);
  }

  async function send() {
    const text = message.trim();
    if (!text || loading) return;
    const sendImages = images.slice();
    setImages([]);
    setMessage('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      // Jangan sertakan sapaan (greeting) ke konteks model — hanya pesan asli.
      const history = messages
        .filter((m) => m.text && m.text !== '' && !m.text.startsWith('Halo! Saya AI desain untuk halaman'))
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const result = await streamAskAi(
        token,
        {
          web_store_id: webStoreId ?? undefined,
          scope: 'page',
          message: text,
          context,
          history,
          images: sendImages.map((im) => ({ data: im.data })),
        },
        (stage, msg) => {
          setAiBusyLabel(msg || (stage === 'thinking' ? 'AI membaca halaman & gambar...' : 'AI mengetik...'));
        },
      );
      setMessages((m) => [...m, { role: 'assistant', text: result.reply, result }]);
      // Simpan ke riwayat toko (memory lintas sesi) — senyap bila gagal.
      // reply_meta membawa `changes` supaya kartu preview bisa direkonstruksi
      // saat riwayat dimuat ulang di sesi berikutnya.
      if (webStoreId && result.reply) {
        persistAiMessage(token, webStoreId, text, result.reply, { changes: result.changes }).catch(() => {});
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || 'AI belum dapat dihubungi. Cek konfigurasi AI.' }]);
    } finally {
      setLoading(false);
    }
  }

  function apply(c: PuckChange[], idx: number) {
    onApply(c);
    setApplied((prev) => new Set(prev).add(idx));
  }

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-700">
          <Sparkles size={16} /> AI
        </button>
      )}
      {open && (
        <section
          className={`fixed right-0 z-[70] flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl transition-all ${
            maximized
              ? 'inset-2 bottom-2 left-2 top-2 h-auto w-auto rounded-2xl sm:inset-3'
              : 'bottom-0 h-[min(640px,86vh)] w-full max-w-sm rounded-t-2xl sm:bottom-5 sm:right-5 sm:rounded-2xl'
          }`}
        >
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <div className="text-sm font-bold">Design With OmBot Ai</div>
                <div className={`truncate text-[11px] text-slate-300 ${maximized ? 'max-w-xs' : 'max-w-[190px]'}`}>“{pageTitle ?? pageSlug}” · blok Puck</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setMaximized((m) => !m)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label={maximized ? 'Kecilkan panel' : 'Perbesar panel'} title={maximized ? 'Kecilkan' : 'Perbesar'}>{maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
              <button type="button" onClick={() => { setMessages([]); }} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Bersihkan chat" title="Bersihkan chat"><Trash2 size={15} /></button>
              <button type="button" onClick={() => { setOpen(false); onClose?.(); }} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Tutup"><X size={17} /></button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.result && m.result.changes.length > 0 && (
                  <div className="mt-2.5 border-t border-slate-200 pt-2">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Usulan perubahan ({m.result.changes.length}) — tinjau sebelum terapkan
                    </div>
                    {changedBlocksOf(data, m.result.changes).map(({ change, block }, j) => (
                      <div key={j} className="mb-2 rounded-xl border border-slate-200 bg-white">
                        <div className="px-2.5 pt-2 text-xs text-slate-600">{change.description}</div>
                        <AiChangePreview block={block} change={change} />
                        <div className="flex items-center justify-end gap-1.5 p-2">
                          {m.history ? (
                            // Usulan dari riwayat sesi lalu: preview saja, tak bisa
                            // di-apply lagi (id/kondisi bisa sudah berubah).
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">
                              <Clock size={12} /> Usulan lama (riwayat) — minta AI ulangi utk kondisi sekarang
                            </span>
                          ) : !confirming.has(i) ? (
                            <button
                              type="button"
                              onClick={() => setConfirming((prev) => new Set(prev).add(i))}
                              disabled={applied.has(i)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Sparkles size={12} /> {applied.has(i) ? 'Diterapkan' : 'Terapkan Perubahan'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirming((prev) => { const n = new Set(prev); n.delete(i); return n; })}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => { apply([change as PuckChange], i); setConfirming((prev) => { const n = new Set(prev); n.delete(i); return n; }); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
                              >
                                <Check size={13} /> Yakin, Terapkan
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {m.result?.warnings?.map((w, j) => (
                  <div key={j} className="mt-1.5 text-[11px] text-amber-700">⚠ {w}</div>
                ))}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" /> {aiBusyLabel || 'AI membaca halaman & gambar...'}
              </div>
            )}
            {historyLoading && !loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={13} className="animate-spin" /> Memuat riwayat chat...
              </div>
            )}
          </div>

          <div className="border-t bg-white p-2.5">
            {images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {images.map((im, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.preview} alt="referensi" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />
                    <button type="button" onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-900 p-0.5 text-white" aria-label="Hapus gambar"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-1.5"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={pickFiles}
              />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 3 || loading} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Unggah screenshot" title="Unggah screenshot referensi">
                <ImagePlus size={16} />
              </button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                onPaste={onPasteImage}
                rows={2}
                placeholder="Contoh: buat hero promo diskon 50% pakai warna brand, atau tempel (Ctrl+V) screenshot & tiru layoutnya..."
                className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button type="submit" disabled={loading || !message.trim()} className="rounded-xl bg-indigo-600 p-2.5 text-white disabled:opacity-40" aria-label="Kirim"><Send size={15} /></button>
            </form>
            <div className="mt-1 text-[10px] text-slate-400">Maks 3 gambar · PNG/JPG/WebP ≤ 6 MB · bisa di-paste (Ctrl+V). Tinjau preview lalu Terapkan — jangan lupa <b>Simpan</b>.</div>
          </div>
        </section>
      )}
    </>
  );
}
