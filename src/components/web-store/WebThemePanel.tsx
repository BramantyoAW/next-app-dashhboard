'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette, Loader2, CheckCircle2, AlertCircle, LayoutGrid, ImagePlus, Upload } from 'lucide-react';
import { upsertWebStore, uploadWebStoreMedia } from '@/graphql/mutation/webstore';
import { defaultTheme, normalizeTheme, THEME_PRESETS, FONT_OPTIONS, type WebTheme } from '@/lib/webTheme';
import { defaultChrome, normalizeChrome, type WebChrome } from '@/lib/webTheme';

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
  initialChrome,
  logoUrl,
  bannerUrl,
  onSaved,
  onMediaChange,
}: {
  token: string;
  webStoreId: string;
  storeId: string;
  storeName: string;
  initialTheme?: Record<string, any> | null;
  initialChrome?: Record<string, any> | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  onSaved?: (theme: WebTheme, chrome?: WebChrome) => void;
  onMediaChange?: (urls: { logo_url: string | null; banner_url: string | null }) => void;
}) {
  const [theme, setTheme] = useState<WebTheme>(() => normalizeTheme(initialTheme ?? null));
  const [chrome, setChrome] = useState<WebChrome>(() => normalizeChrome(initialChrome ?? null));
  const [logo, setLogo] = useState(logoUrl ?? null);
  const [banner, setBanner] = useState(bannerUrl ?? null);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  // Sinkron bila data luar berubah (mis. habis load).
  useEffect(() => {
    setTheme(normalizeTheme(initialTheme ?? null));
  }, [initialTheme]);
  useEffect(() => {
    setChrome(normalizeChrome(initialChrome ?? null));
  }, [initialChrome]);
  useEffect(() => {
    setLogo(logoUrl ?? null);
  }, [logoUrl]);
  useEffect(() => {
    setBanner(bannerUrl ?? null);
  }, [bannerUrl]);

  async function handleUpload(col: 'logo' | 'banner', file?: File | null) {
    if (!token || !file) return;
    setUploading(col);
    setErr('');
    try {
      const res = await uploadWebStoreMedia(token, col, file);
      const u = res.uploadWebStoreMedia;
      if (col === 'logo') setLogo(u.logo_url);
      else setBanner(u.banner_url);
      onMediaChange?.({ logo_url: u.logo_url, banner_url: u.banner_url });
      setOk('Gambar diperbarui.');
    } catch (e: any) {
      setErr(e?.message ?? 'Upload gagal');
    } finally {
      setUploading(null);
      if (col === 'logo' && logoInput.current) logoInput.current.value = '';
      if (col === 'banner' && bannerInput.current) bannerInput.current.value = '';
    }
  }

  async function saveTheme() {
    if (!token) return;
    setSaving(true);
    setOk('');
    setErr('');
    try {
      await upsertWebStore(token, {
        store_id: storeId,
        store_name: storeName,
        settings: { theme, chrome },
      });
      setOk('Tema & tampilan disimpan. Editor dan toko memakai pengaturan ini.');
      onSaved?.(theme, chrome);
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

      {/* Logo & Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {(
          [
            ['logo', 'Logo', logo],
            ['banner', 'Banner', banner],
          ] as const
        ).map(([col, label, url]) => (
          <div key={col} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
            </div>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={label} className="h-20 w-full object-contain rounded-lg bg-white border" />
            ) : (
              <div className="h-20 rounded-lg bg-white border flex items-center justify-center text-slate-300">
                <ImagePlus size={20} />
              </div>
            )}
            <label className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-slate-700 disabled:opacity-50">
              <Upload size={12} />
              {uploading === col ? 'Mengunggah…' : url ? 'Ganti File' : 'Unggah File'}
              <input
                ref={col === 'logo' ? logoInput : bannerInput}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading !== null}
                onChange={(e) => handleUpload(col, e.target.files?.[0])}
              />
            </label>
          </div>
        ))}
      </div>
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

      {/* CSS & JS Kustom Global */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 mb-1">CSS &amp; JavaScript Kustom (Global)</h3>
        <p className="text-[11px] text-slate-500 mb-2">
          Dipakai di semua halaman storefront — berguna utk gaya lanjutan/script. Kosongkan jika tidak perlu.
        </p>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Custom CSS</label>
        <textarea
          value={theme.custom_css}
          onChange={(e) => setTheme({ ...theme, custom_css: e.target.value })}
          placeholder="/* contoh: .judul-utama { letter-spacing: 1px; } */"
          rows={4}
          spellCheck={false}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mt-3 mb-1">Custom JavaScript</label>
        <textarea
          value={theme.custom_js}
          onChange={(e) => setTheme({ ...theme, custom_js: e.target.value })}
          placeholder="// contoh: console.log('halo');"
          rows={3}
          spellCheck={false}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Gaya Tombol</label>
          <div className="flex gap-1.5">
            {(['rounded', 'square', 'pill'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTheme({ ...theme, buttonStyle: s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                  theme.buttonStyle === s
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s === 'rounded' ? 'Membulat' : s === 'pill' ? 'Pill' : 'Kotak'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Header & Footer global (chrome toko) */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2">
          <LayoutGrid size={14} className="text-slate-500" /> Header &amp; Footer (Global)
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Dipakai storefront klasik (chrome di sekitar konten). Halaman kanvas memakai blok Header/Footer miliknya sendiri.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {(
            [
              ['show_search', 'Tampilkan pencarian'],
              ['show_feature_strip', 'Tampilkan strip info'],
              ['show_orders', 'Tampilkan link Pesanan'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={chrome.header[key]}
                onChange={(e) => setChrome({ ...chrome, header: { ...chrome.header, [key]: e.target.checked } })}
                className="accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Teks Tentang Toko (footer)</label>
        <textarea
          value={chrome.footer.about_text}
          onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, about_text: e.target.value } })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Teks Hak Cipta</label>
            <input
              value={chrome.footer.copyright_text}
              onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, copyright_text: e.target.value } })}
              placeholder="(kosong = otomatis)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Badge Pembayaran (pisahkan koma)</label>
            <input
              value={chrome.footer.payments.join(', ')}
              onChange={(e) =>
                setChrome({
                  ...chrome,
                  footer: { ...chrome.footer, payments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                })
              }
              placeholder="BCA, QRIS, COD"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Sosial Media</label>
          <div className="space-y-1.5">
            {chrome.footer.socials.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={s.platform}
                  onChange={(e) =>
                    setChrome({
                      ...chrome,
                      footer: { ...chrome.footer, socials: chrome.footer.socials.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)) },
                    })
                  }
                  placeholder="Platform (Instagram…)"
                  className="w-1/3 px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  value={s.url}
                  onChange={(e) =>
                    setChrome({
                      ...chrome,
                      footer: { ...chrome.footer, socials: chrome.footer.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) },
                    })
                  }
                  placeholder="https://…"
                  className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setChrome({ ...chrome, footer: { ...chrome.footer, socials: chrome.footer.socials.filter((_, j) => j !== i) } })
                  }
                  className="px-2 text-slate-400 hover:text-rose-500 text-xs"
                  aria-label="Hapus sosial"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setChrome({ ...chrome, footer: { ...chrome.footer, socials: [...chrome.footer.socials, { platform: '', url: '' }] } })
              }
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              + Tambah sosial media
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 mt-3">
          <input
            type="checkbox"
            checked={chrome.footer.show_powered_by}
            onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, show_powered_by: e.target.checked } })}
            className="accent-blue-600"
          />
          Tampilkan &quot;Powered by om-bot.com&quot;
        </label>
      </div>
    </div>
  );
}
