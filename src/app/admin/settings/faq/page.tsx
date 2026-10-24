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
        <div className="rounded-xl p-2.5 ds-accent-text" style={{ background: 'var(--ds-surface-2)' }}>
          <HelpCircle size={22} />
        </div>
        <div>
          <h1 className="ds-h1">FAQ OmBot AI</h1>
          <p className="ds-small">
            Jawaban di sini dipakai <b>OmBot AI Assistance</b> saat owner bertanya hal umum
            (di luar data toko seperti stok/harga/order). Hanya FAQ <b>aktif</b> yang dipakai.
          </p>
        </div>
      </div>

      {status && (
        <div className="ds-alert" data-tone={status.type === 'success' ? 'ok' : 'bad'}>
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {status.message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="ds-card ds-card-pad space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ds-h2">
            {editingId ? 'Ubah FAQ' : 'Tambah FAQ baru'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="ds-btn" data-variant="ghost">
              Batal edit
            </button>
          )}
        </div>

        <input
          className="ds-input"
          placeholder="Pertanyaan, mis. Bagaimana cara menambah stok?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea
          className="ds-textarea"
          rows={3}
          placeholder="Jawaban yang akan dipakai AI…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="ds-input w-48"
            placeholder="Kategori (opsional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <label className="ds-check-label">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktif
          </label>
          <button
            type="submit"
            disabled={saving}
            className="ds-btn ml-auto" data-variant="primary"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {editingId ? 'Simpan perubahan' : 'Tambah FAQ'}
          </button>
        </div>
      </form>

      {/* Daftar */}
      <div className="ds-card">
        <div className="ds-h2 px-5 py-3" style={{ borderBottom: '1px solid var(--ds-border)' }}>
          Daftar FAQ ({items.length})
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-5 ds-small">
            <Loader2 size={16} className="animate-spin" /> Memuat…
          </div>
        ) : items.length === 0 ? (
          <p className="ds-note">Belum ada FAQ. Tambahkan yang pertama di atas.</p>
        ) : (
          <ul className="divide-y divide-[var(--ds-border)]">
            {items.map((f) => (
              <li key={f.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ds-body" style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{f.question}</span>
                    {f.category && (
                      <span className="ds-chip">
                        {f.category}
                      </span>
                    )}
                    <span className="ds-badge" data-tone={f.is_active ? 'ok' : 'neutral'}>
                      {f.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="ds-caption mt-1 whitespace-pre-wrap">{f.answer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(f)}
                    className="ds-btn" data-variant="ghost"
                    title={f.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {f.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => startEdit(f)}
                    className="ds-btn" data-variant="ghost"
                    title="Ubah"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="ds-btn" data-variant="danger"
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
