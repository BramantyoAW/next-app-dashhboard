'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, ImagePlus, Loader2, Send, Sparkles, X, Trash2 } from 'lucide-react';
import { askWebStoreAssistant, persistAiMessage, clearAiHistory, type AiAssistantResult } from '@/graphql/mutation/aiAssistant';
import { getAiChatHistory } from '@/graphql/query/aiAssistant';

export function WebStoreAiAssistant({ context, webStoreId, scope = 'setup', onApply }: { context: unknown; webStoreId?: string | null; scope?: 'setup' | 'homepage' | 'pdp' | 'plp' | 'checkout' | 'page'; onApply: (changes: AiAssistantResult['changes']) => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<{ preview: string; data: string }[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; result?: AiAssistantResult }[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [appliedMessages, setAppliedMessages] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!webStoreId) return;
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    setHistoryLoading(true);
    getAiChatHistory(token, webStoreId)
      .then((res) => setMessages((res.aiChatHistory?.messages ?? []).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.content }))))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [webStoreId]);
  async function send() {
    const text = message.trim(); if (!text || loading) return;
    const token = localStorage.getItem('token') || ''; if (!token) return;
    const sendImages = images.slice();
    setImages([]); setMessage(''); setMessages((m) => [...m, { role: 'user', text }]); setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      const res = await askWebStoreAssistant(token, { web_store_id: webStoreId ?? undefined, scope, message: text, context, history, images: sendImages.map((im) => ({ data: im.data })) });
      const result = res.aiWebStoreAssistant;
      setMessages((m) => [...m, { role: 'assistant', text: result.reply, result }]);
      if (webStoreId) await persistAiMessage(token, webStoreId, text, result.reply);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || 'AI assistant belum dapat dihubungi.' }]);
    } finally { setLoading(false); }
  }

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
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-700">
        <Sparkles size={16} /> Design dengan AI
      </button>
      {open && <div className="fixed inset-0 z-50 bg-slate-900/30" onClick={() => setOpen(false)} />}
      {open && (
        <section className="fixed bottom-0 right-0 z-[51] flex h-[min(720px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:rounded-2xl">
          <header className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white"><div className="flex items-center gap-2"><Bot size={20} /><div><div className="font-bold">Design dengan AI</div><div className="text-[11px] text-slate-300">Scope: {scope} · {historyLoading ? 'Memuat riwayat…' : 'riwayat tersimpan'}</div></div></div><div className="flex items-center gap-2"><button type="button" disabled={!webStoreId} onClick={async () => { const token = localStorage.getItem('token') || ''; if (token && webStoreId) { await clearAiHistory(token, webStoreId).catch(() => {}); setMessages([]); } }} aria-label="Hapus riwayat" title="Hapus riwayat" className="rounded-lg p-1.5 hover:bg-white/10"><Trash2 size={16} /></button><button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="rounded-lg p-1.5 hover:bg-white/10"><X size={18} /></button></div></header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500"><Sparkles size={16} className="mb-2 text-indigo-500" />Contoh: “Buat homepage lebih premium dengan warna hijau dan CTA ke katalog.”</div>}
            {messages.map((m, i) => <div key={i} className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}><div className="whitespace-pre-wrap">{m.text}</div>{m.result && m.result.changes.length > 0 && <div className="mt-3 border-t border-slate-200 pt-2"><div className="mb-2 text-[11px] font-bold uppercase text-slate-400">Usulan perubahan</div>{m.result.changes.map((c, j) => <div key={j} className="mb-2 text-xs text-slate-600">• {c.description}</div>)}<button type="button" onClick={() => { onApply(m.result!.changes); setAppliedMessages((prev) => new Set(prev).add(i)); }} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Check size={14} /> {appliedMessages.has(i) ? 'Sudah Diterapkan ke Draft' : 'Terapkan Perubahan'}</button></div>}{m.result?.warnings?.map((w, j) => <div key={j} className="mt-2 text-xs text-amber-700">⚠ {w}</div>)}</div>)}
            {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> AI sedang berpikir...</div>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t p-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {images.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {images.map((im, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.preview} alt="referensi" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
                      <button type="button" onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-900 p-0.5 text-white" aria-label="Hapus gambar"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={pickFiles} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 3 || loading} className="rounded-xl border border-slate-300 px-2.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Unggah screenshot" title="Unggah screenshot referensi (maks 3, PNG/JPG/WebP ≤ 6MB)"><ImagePlus size={16} /></button>
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tulis instruksi desain..." className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                <button type="submit" disabled={loading || !message.trim()} className="rounded-xl bg-indigo-600 px-3 text-white disabled:opacity-40" aria-label="Kirim"><Send size={16} /></button>
              </div>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
