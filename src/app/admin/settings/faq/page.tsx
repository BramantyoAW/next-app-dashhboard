'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, HelpCircle, Loader2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { deleteFaqService, getFaqsService, upsertFaqService, type Faq } from '@/graphql/faq';

/**
 * FAQ global untuk OmBot AI Assistance — diatur administrator.
 * Jawaban di sini dipakai AI saat owner bertanya hal umum (bukan data toko).
 */
export default function FaqSettingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await getFaqsService(token);
      setItems(res.faqs ?? []);
    } catch {
      setStatus({ type: 'error', message: 'Gagal memuat FAQ.' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setCategory('');
    setIsActive(true);
  }

  function startEdit(f: Faq) {
    setEditingId(f.id);
    setQuestion(f.question);
    setAnswer(f.answer);
    setCategory(f.category ?? '');
    setIsActive(!!f.is_active);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!question.trim() || !answer.trim()) {
      setStatus({ type: 'error', message: 'Pertanyaan dan jawaban wajib diisi.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await upsertFaqService(token, {
        id: editingId,
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || null,
        is_active: isActive,
        sort_order: editingId ? undefined : items.length + 1,
      });
      setStatus({ type: 'success', message: editingId ? 'FAQ diperbarui.' : 'FAQ ditambahkan.' });
      resetForm();
      await load();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan FAQ.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Faq) {
    if (!confirm(`Hapus FAQ "${f.question}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await deleteFaqService(token, f.id);
      setStatus({ type: 'success', message: 'FAQ dihapus.' });
      if (editingId === f.id) resetForm();
      await load();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Gagal menghapus FAQ.' });
    }
  }

  async function toggleActive(f: Faq) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await upsertFaqService(token, { id: f.id, is_active: !f.is_active });
      await load();
    } catch {
      setStatus({ type: 'error', message: 'Gagal mengubah status.' });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <HelpCircle size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">FAQ OmBot AI</h1>
          <p className="text-sm text-slate-500">
            Jawaban di sini dipakai <b>OmBot AI Assistance</b> saat owner bertanya hal umum
            (di luar data toko seperti stok/harga/order). Hanya FAQ <b>aktif</b> yang dipakai.
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {status.message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">
            {editingId ? 'Ubah FAQ' : 'Tambah FAQ baru'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 hover:underline">
              Batal edit
            </button>
          )}
        </div>

        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Pertanyaan, mis. Bagaimana cara menambah stok?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
          placeholder="Jawaban yang akan dipakai AI…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="w-48 rounded-lg border px-3 py-2 text-sm"
            placeholder="Kategori (opsional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktif
          </label>
          <button
            type="submit"
            disabled={saving}
            className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {editingId ? 'Simpan perubahan' : 'Tambah FAQ'}
          </button>
        </div>
      </form>

      {/* Daftar */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-700">
          Daftar FAQ ({items.length})
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Memuat…
          </div>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Belum ada FAQ. Tambahkan yang pertama di atas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((f) => (
              <li key={f.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{f.question}</span>
                    {f.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {f.category}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {f.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{f.answer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(f)}
                    className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                    title={f.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {f.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => startEdit(f)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Ubah"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    title="Hapus"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
