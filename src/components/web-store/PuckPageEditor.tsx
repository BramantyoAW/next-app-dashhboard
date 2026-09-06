'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Eye, AlertCircle, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { Puck, Render, resolveAllData, type Data } from '@puckeditor/core';
import '@puckeditor/core/dist/index.css';
import { puckLabConfig } from '@/lib/puckLabConfig';
import { isPuckStored, defaultPuckDataFor, legacyToPuckData, puckDataOf, legacyOf } from '@/lib/puckAdapter';
import { setUploadToken } from '@/lib/puckImageField';

/** Bentuk halaman yang diterima editor (hasil query web store). */
type PuckStoredPage = { id: string; slug: string; title: string; blocks: unknown };

/** Tipe halaman yang bisa dibuat dari editor (+ Halaman Baru). */
const PAGE_TYPES = [
  { value: 'home', label: 'Beranda (home)' },
  { value: 'about', label: 'Tentang (about)' },
  { value: 'contact', label: 'Kontak (contact)' },
  { value: 'faq', label: 'FAQ (faq)' },
  { value: 'product', label: 'Halaman Produk / PDP (product)' },
  { value: 'cart', label: 'Keranjang (cart)' },
  { value: 'checkout', label: 'Checkout (checkout)' },
  { value: 'category', label: 'Kategori Produk (category)' },
  { value: '__custom__', label: 'Halaman statis baru (slug bebas)' },
];

/**
 * Editor halaman nyata berbasis Puck (plugin, omBot tidak menimpa).
 *
 * - Data Puck disimpan ganda: { puck, legacy } (legacy utk storefront lama).
 * - Konversi otomatis blok lama → Puck saat halaman belum berformat puck.
 */

export default function PuckPageEditor({
  token,
  pageId,
  initial,
  onSave,
  themeCss = '',
}: {
  token: string;
  pageId: string;
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
  const [newSlug, setNewSlug] = useState('about');
  const [customSlug, setCustomSlug] = useState('');
  const [creating, setCreating] = useState(false);

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
    // Slug tujuan: tipe preset, atau slug bebas custom.
    let slug = newSlug;
    if (newSlug === '__custom__') {
      const s = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!s) {
        setError('Isi dulu slug halaman baru (mis. promo, kebijakan, katalog).');
        return;
      }
      slug = s;
    }
    // Buka halaman Pages Manager dengan instruksi auto-create utk slug ini.
    setCreating(true);
    router.push(`/owner/web-store/pages?new=${encodeURIComponent(slug)}`);
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
            {/* Buat halaman baru (langsung dari editor) */}
            <select
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              title="Tipe halaman baru"
              className="hidden sm:block max-w-[150px] px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
            >
              {PAGE_TYPES.filter((t) => t.value !== initial.slug || t.value === '__custom__').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              placeholder="slug-baru"
              title="Slug halaman statis baru (huruf kecil, tanpa spasi)"
              className={`hidden sm:block w-28 px-2 py-2 rounded-lg border text-xs font-semibold focus:outline-none ${newSlug === '__custom__' ? 'border-blue-400 bg-blue-50 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-300'}`}
              disabled={newSlug !== '__custom__'}
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
            overrides={{ headerActions: () => <></> }}
          />
        </div>
      )}
    </div>
  );
}
