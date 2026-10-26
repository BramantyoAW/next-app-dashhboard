'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { Brain, CheckCircle2, Info, Sparkles } from 'lucide-react';

/**
 * Model LLM untuk seluruh fitur AI (chat Telegram/WhatsApp, Assistance, Design).
 *
 * Satu setelan untuk semua jalur: backend membacanya lewat AiConfig, jadi
 * chat dan web tidak mungkin memakai model berbeda. Harga dan kualitas model
 * bergerak cepat, karena itu nama model tidak dikunci di `.env` — administrator
 * bisa menggantinya di sini tanpa rebuild container.
 *
 * Daftar saran diambil dari model yang dikenal, tetapi isian tetap bebas:
 * katalog gateway berubah tanpa bisa diprediksi, dan menolak nama baru akan
 * membuat halaman ini menghalangi justru saat paling dibutuhkan.
 */
const SARAN_MODEL = [
  'qwen3.7-ComBoZ',
  'GLM5.3-FLASH-ComBoZ',
  'Deepseek-v4.1-Flash-ComboZ',
  'Deepseek-v4-Flash-ComboZ',
  'GPT-5.6-luna-ComBoZ',
  'MIMO-v2.5-ComBoZ',
];

export default function AiSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [model, setModel] = useState('');
  // Model yang sedang aktif di server. Ditampilkan terpisah supaya
  // administrator tahu nilai mana yang benar-benar dipakai saat ini,
  // bukan sekadar apa yang sedang diketik.
  const [aktif, setAktif] = useState('');

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await adminGetAppSettingsService(token);
      const item = res.appSettings.find((s: any) => s.key === 'ai_model');
      const nilai = item?.value ?? '';

      setAktif(nilai);
      setModel(nilai);
    } catch {
      setStatus({ type: 'error', message: 'Gagal memuat pengaturan AI.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // Sengaja hanya sekali saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nilai = model.trim();

    if (!nilai) {
      setStatus({ type: 'error', message: 'Isi nama model terlebih dahulu.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await adminUpsertAppSettingsService(token, [
        { key: 'ai_model', value: nilai, type: 'string' },
      ]);

      setAktif(nilai);
      setStatus({ type: 'success', message: 'Model tersimpan. Berlaku untuk chat dan web dalam 5 menit (langsung setelah cache dibersihkan).' });
      setTimeout(() => setStatus(null), 8000);
    } catch {
      setStatus({ type: 'error', message: 'Gagal menyimpan model.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Brain size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model AI</h1>
          <p className="text-sm text-muted-foreground">
            Satu model untuk chat WhatsApp/Telegram, Assistance, dan Design.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3.5 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1.5 text-muted-foreground">
            <p>
              Biaya satu pesan chat tidak bergantung pada jumlah tool yang dipanggil: sistem memotong{' '}
              <strong>1 AI Point per permintaan</strong> di awal, terlepas dari model yang dipakai.
            </p>
            <p>
              Bila nama model tidak dikenal gateway, AI akan gagal menjawab. Kembalikan ke nilai sebelumnya bila itu
              terjadi.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {aktif && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>
                  Model aktif: <span className="font-mono font-semibold">{aktif}</span>
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1.5">Nama model</label>
              <input
                list="saran-model"
                name="ai_model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="qwen3.7-ComBoZ"
                className="w-full rounded-xl border bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <datalist id="saran-model">
                {SARAN_MODEL.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nama harus sama persis dengan yang dikenali gateway AI.
              </p>
            </div>

            {status && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-sm ${
                  status.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving || !model.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan model'}
              </button>
              {aktif && model.trim() !== aktif && (
                <button
                  type="button"
                  onClick={() => setModel(aktif)}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  <Sparkles size={15} />
                  Kembalikan
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
