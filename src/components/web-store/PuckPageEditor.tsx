'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Eye, AlertCircle, CheckCircle2, Trash2, Plus, Sparkles } from 'lucide-react';
import { Puck, Render, resolveAllData, usePuck, type Data } from '@puckeditor/core';
import '@puckeditor/core/dist/index.css';
import { puckLabConfig } from '@/lib/puckLabConfig';
import { isPuckStored, defaultPuckDataFor, legacyToPuckData, puckDataOf, legacyOf } from '@/lib/puckAdapter';
import { setUploadToken } from '@/lib/puckImageField';
import { PuckAiAssistant, applyBlockOpsToPuck } from './PuckAiAssistant';
import type { AiChangeSuggestion } from '@/graphql/mutation/aiAssistant';

/** Bentuk halaman yang diterima editor (hasil query web store). */
type PuckStoredPage = { id: string; slug: string; title: string; blocks: unknown };

/**
 * Jembatan store internal Puck ↔ state React editor.
 *
 * Puck memakai `data` prop hanya sekali saat mount (initial state); perubahan
 * `data` dari luar (mis. Terapkan perubahan AI) TIDAK otomatis masuk ke store
 * internal → kanvas tak berubah walau state React sudah baru. Bridge ini
 * meregistrasi `dispatch` (dan getState) ke ref agar kode editor (apply AI,
 * seed default, publish) bisa dispatch action `setData` saat dibutuhkan —
 * tanpa sync otomatis tiap render (hindari loop onChange ↔ setData).
 */
function PuckStoreBridge({ onApi }: { onApi: (api: { dispatch: (a: any) => void; getState: () => unknown }) => void }) {
  const { dispatch } = usePuck();
  const apiRef = useRef({ dispatch, getState: () => null });
  apiRef.current.dispatch = dispatch;
  useEffect(() => {
    onApi(apiRef.current);
    return () => onApi({ dispatch: () => {}, getState: () => null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onApi, dispatch]);
  return null;
}

/**
 * Editor halaman nyata berbasis Puck (plugin, omBot tidak menimpa).
 *
 * - Data Puck disimpan ganda: { puck, legacy } (legacy utk storefront lama).
 * - Konversi otomatis blok lama → Puck saat halaman belum berformat puck.
 */

export default function PuckPageEditor({
  token,
  pageId,
  webStoreId,
  initial,
  onSave,
  themeCss = '',
}: {
  token: string;
  pageId: string;
  webStoreId?: string | null;
  initial: PuckStoredPage;
  onSave: (blocks: unknown) => Promise<void>;
  themeCss?: string;
}) {
  const router = useRouter();
  // Pastikan token tersedia utk field upload gambar (custom field Puck).
  useEffect(() => {
    setUploadToken(token);
  }, [token]);
  const [data, setData] = useState<Data>(() => {
    const stored = puckDataOf(initial.blocks);
    if (stored) return stored;
    const legacy = legacyOf(initial.blocks);
    if (legacy.length > 0) return legacyToPuckData(legacy);
    // Halaman baru / kosong → lahir lengkap dengan default per tipe halaman
    // (home → hero+katalog, product → slot produk dinamis, dst).
    return defaultPuckDataFor(initial.slug);
  });
  const [preview, setPreview] = useState(false);
  const [resolved, setResolved] = useState<Data | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  // API store internal Puck (dispatch setData) — diisi PuckStoreBridge saat mount.
  const puckApiRef = useRef<{ dispatch: (a: any) => void } | null>(null);
  const setPuckApi = useCallback((api: { dispatch: (a: any) => void; getState: () => unknown }) => {
    puckApiRef.current = api;
  }, []);

  /** Set data editor & sinkronkan store internal Puck (apply AI / seed). */
  const commitData = useCallback((next: Data) => {
    dataRef.current = next;
    setData(next);
    // Store internal Puck memakai data prop hanya saat mount; dorong manual
    // supaya kanvas ikut berubah (Terapkan AI / publish).
    puckApiRef.current?.dispatch({ type: 'setData', data: next });
  }, []);

  const legacy = useMemo(
    () => (isPuckStored(initial.blocks) ? legacyOf(initial.blocks) : legacyOf(initial.blocks)),
    [initial.blocks]
  );

  // Halaman baru (blocks kosong): seed default langsung AUTO-SIMPAN sekali,
  // supaya kalau user menutup editor tanpa klik Simpan, halaman tidak hilang.
  const didAutoSeed = useRef(false);
  const isNewPage = useMemo(
    () => !isPuckStored(initial.blocks) && legacyOf(initial.blocks).length === 0,
    [initial.blocks]
  );
  useEffect(() => {
    if (!isNewPage || didAutoSeed.current || !token) return;
    didAutoSeed.current = true;
    const seed = defaultPuckDataFor(initial.slug);
    setData(seed);
    onSave({ puck: seed, legacy: [] })
      .then(() => setOk('Template default tersimpan otomatis — silakan edit & Simpan lagi.'))
      .catch(() => setError('Gagal auto-simpan template. Klik Simpan untuk menyimpan.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewPage, token]);

  const handlePublish = useCallback((next: Data) => {
    setData(next);
  }, []);

  function createNewPage() {
    // SELALU buat halaman statis baru yang literal — slug bebas dari input.
    const s = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s) {
      setError('Isi dulu slug halaman baru (mis. promo, kebijakan, katalog).');
      return;
    }
    // Buka halaman Pages Manager dengan instruksi auto-create utk slug ini.
    setCreating(true);
    router.push(`/owner/web-store/pages?new=${encodeURIComponent(s)}`);
  }

  async function save() {    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const legacyFromStore = legacyOf(initial.blocks);
      const puckContent = (data?.content ?? []).filter((c) => c && (c as { type?: string }).type);
      // Proteksi: kalau puck kosong & legacy asli masih ada isi, jangan
      // simpan (akan menghapus halaman). User harus punya minimal 1 blok.
      // (Kalau legacy juga kosong = halaman memang baru → boleh simpan.)
      if (puckContent.length === 0 && legacyFromStore.length > 0) {
        setError('Halaman masih kosong di editor. Tambah minimal satu blok dulu — legacy lama tidak ditimpa.');
        setSaving(false);
        return;
      }
      // Simpan ganda: puck (data editor) + legacy (utk storefront lama).
      // Kalau puck diubah (ada isi), legacy lama dipertahankan (storefront
      // tetap tampil) sampai renderer storefront Puck selesai.
      await onSave({ puck: data, legacy: legacyFromStore });
      setOk('Tersimpan! Data Puck disimpan; storefront lama tetap memakai legacy selama transisi.');
    } catch (e: any) {
      setError(e?.message ?? 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  // Resolve utk preview (default props + id)
  useEffect(() => {
    if (!preview) return;
    let on = true;
    resolveAllData(data, puckLabConfig as any)
      .then((r) => {
        if (on) setResolved(r as Data);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [preview, data]);

  /**
   * Terapkan usulan AI (block_ops) langsung ke kanvas Puck halaman ini.
   * Perubahan global (theme/chrome) bukan ranah editor halaman — dilewati
   * dengan catatan singkat supaya owner pindah ke Setup bila perlu.
   */
  function applyAiChanges(changes: AiChangeSuggestion[]) {
    let applied = 0;
    let skipped = 0;
    const localOps: { op: string; id?: string; ids?: string[]; props?: Record<string, unknown>; style?: Record<string, unknown>; blocks?: Record<string, unknown>[] }[] = [];

    for (const change of changes) {
      const field = change.field || '';
      const to = change.to as { slug?: string; ops?: unknown[] } | null;
      const isBlockOps = field === 'block_ops' || field.startsWith('block_ops:');
      if (isBlockOps && to && Array.isArray(to.ops)) {
        // Hanya terapkan utk slug halaman ini; slug lain dilewati.
        const slug = (to.slug ?? field.slice('block_ops:'.length)) || initial.slug;
        if (slug === initial.slug) {
          localOps.push(...(to.ops as any[]));
          applied++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    if (localOps.length === 0) {
      setAiNote(applied > 0 ? 'Semua usulan utk halaman lain — hanya usulan utk halaman ini yang diterapkan.' : 'Tidak ada perubahan blok yang bisa diterapkan ke halaman ini.');
      return;
    }
    // Terapkan ke state mutakhir (dataRef) — aman walau dialog AI menyimpan snapshot lama.
    const { next, used } = applyBlockOpsToPuck(dataRef.current, initial.slug, localOps);
    commitData(next);
    if (used === 0) {
      setAiNote('Ops AI tidak cocok dengan blok halaman ini (id berubah?). Coba minta AI mengulang.');
      return;
    }
    const skippedMsg = skipped > 0 ? ` (${skipped} usulan global/halaman lain dilewati — gunakan halaman Setup utk tema global)` : '';
    setAiNote(`AI diterapkan ke kanvas (${used} operasi). Tinjau lalu klik Simpan.${skippedMsg}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Tema global toko (CSS vars) — biar kanvas editor & preview memakai
          warna/font yang sama dengan storefront. */}
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {/* Bar atas */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/owner/web-store/pages')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <ArrowLeft size={16} /> Halaman
            </button>
            <span className="hidden sm:inline h-4 w-px bg-slate-200" />
            <h1 className="truncate text-sm font-extrabold text-slate-800">{initial.title}</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wide">{initial.slug}</span>
            {isPuckStored(initial.blocks) ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">Puck</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">blok lama → dikonversi</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Buat halaman baru (langsung dari editor) — SELALU create literal */}
            <input
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createNewPage(); }}
              placeholder="slug-baru (mis. promo)"
              title="Slug halaman baru — huruf kecil, tanpa spasi"
              className="w-36 px-2.5 py-2 rounded-lg border border-blue-300 bg-blue-50/50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createNewPage}
              disabled={creating || !token}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors disabled:opacity-50"
              title="Buat halaman baru lalu buka editornya"
            >
              {creating ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />} Halaman Baru
            </button>
            <button
              onClick={() => setPreview((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                preview ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye size={15} /> {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => setAiOpen(true)}
              disabled={!token || !webStoreId}
              title={!webStoreId ? 'Web store belum siap' : 'Desain halaman ini dengan AI'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 disabled:opacity-50 text-white text-sm font-bold shadow"
            >
              <Sparkles size={15} /> Design With OmBot Ai
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow"
            >
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Simpan
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle size={13} /> {error}
          </div>
        )}
        {ok && (
          <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-emerald-50 border-t border-emerald-200 text-emerald-700 text-xs font-medium">
            <CheckCircle2 size={13} /> {ok}
          </div>
        )}
        {aiNote && (
          <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-2 bg-fuchsia-50 border-t border-fuchsia-200 text-fuchsia-700 text-xs font-medium">
            <span className="flex items-center gap-2"><Sparkles size={13} /> {aiNote}</span>
            <button onClick={() => setAiNote(null)} className="hover:text-fuchsia-900 font-bold" aria-label="Tutup notifikasi AI">✕</button>
          </div>
        )}
      </div>

      {/* Preview / Edit */}
      {preview ? (
        <div className="flex-1 overflow-auto">
          {!resolved ? (
            <div className="p-10 text-center text-sm text-slate-400">Menyiapkan preview...</div>
          ) : (
            <Render config={puckLabConfig} data={resolved} />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Puck
            config={puckLabConfig}
            data={data}
            onChange={(next) => setData(next as Data)}
            onPublish={handlePublish}
            iframe={{ enabled: false }}
            overrides={{
              headerActions: () => <></>,
              // Bungkus kanvas editor default: sisipkan bridge store internal
              // (dispatch setData) TANPA mengganti kanvas/interaksi editor.
              preview: ({ children }: { children?: React.ReactNode }) => (
                <>
                  <PuckStoreBridge onApi={setPuckApi} />
                  {children}
                </>
              ),
            }}
          />
        </div>
      )}

      {aiOpen && token && webStoreId && (
        <PuckAiAssistant
          token={token}
          webStoreId={webStoreId}
          pageSlug={initial.slug}
          pageTitle={initial.title}
          data={data}
          context={{ current_page: { slug: initial.slug, title: initial.title } }}
          onApply={applyAiChanges}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
