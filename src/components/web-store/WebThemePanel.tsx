'use client';

import { useEffect, useState } from 'react';
import { Palette, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { upsertWebStore } from '@/graphql/mutation/webstore';
import { defaultTheme, normalizeTheme, THEME_PRESETS, FONT_OPTIONS, type WebTheme } from '@/lib/webTheme';

/**
 * Panel "Tema Toko" — pengaturan global warna/font yang dipakai page builder
 * & storefront (CSS variables). Disimpan ke web_store.settings.theme.
 * Dipasang di Pages Manager supaya tema & halaman diatur di satu tempat.
 */
export default function WebThemePanel({
  token,
  webStoreId,
  storeId,
  storeName,
  initialTheme,
  onSaved,
}: {
  token: string;
  webStoreId: string;
  storeId: string;
  storeName: string;
  initialTheme?: Record<string, any> | null;
  onSaved?: (theme: WebTheme) => void;
}) {
  const [theme, setTheme] = useState<WebTheme>(() => normalizeTheme(initialTheme ?? null));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  // Sinkron bila data luar berubah (mis. habis load).
  useEffect(() => {
    setTheme(normalizeTheme(initialTheme ?? null));
  }, [initialTheme]);

  async function saveTheme() {
    if (!token) return;
    setSaving(true);
    setOk('');
    setErr('');
    try {
      await upsertWebStore(token, {
        store_id: storeId,
        store_name: storeName,
        settings: { theme },
      });
      setOk('Tema disimpan. Editor & toko memakai warna/font ini.');
      onSaved?.(theme);
    } catch (e: any) {
      setErr(e?.message ?? 'Gagal menyimpan tema');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Palette size={18} className="text-blue-600" /> Tema Toko
        </h2>
        <button
          onClick={saveTheme}
          disabled={saving || !token}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
          Simpan Tema
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Warna &amp; font global toko — dipakai semua halaman di Page Builder dan tampil di storefront.
      </p>
      {ok && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <CheckCircle2 size={13} /> {ok}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle size={13} /> {err}
        </div>
      )}

      {/* Preset */}
      <div className="flex flex-wrap gap-2 mb-4">
        {THEME_PRESETS.map((p) => {
          const active =
            theme.font === p.theme.font &&
            theme.colors.brand === p.theme.colors.brand &&
            theme.colors.bg === p.theme.colors.bg &&
            theme.radius === p.theme.radius;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => setTheme((t) => ({ ...t, ...p.theme, custom_css: t.custom_css }))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active ? 'border-slate-900 bg-slate-900 text-white shadow-sm scale-105' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: p.theme.colors.brand }} />
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Font */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Font</label>
          <select
            value={theme.font}
            onChange={(e) => setTheme({ ...theme, font: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        {/* Radius */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Sudut (radius): {theme.radius}px
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={theme.radius}
            onChange={(e) => setTheme({ ...theme, radius: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
        {/* Warna */}
        {(
          [
            ['brand', 'Warna Aksen'],
            ['bg', 'Latar'],
            ['text', 'Teks'],
            ['muted', 'Teks Redup'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.colors[key]}
                onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={theme.colors[key]}
                onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 mt-3">
        Tema ini disimpan global (bukan per halaman). Semua halaman baru memakainya.
      </p>
    </div>
  );
}
