'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { upsertWebStore, upsertWebPage, uploadWebStoreMedia } from '@/graphql/mutation/webstore';
import { myStoresService } from '@/graphql/query/myStores';
import type { WebStore, WebPage, ShippingMethod } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { defaultTheme, normalizeTheme, THEME_PRESETS, FONT_OPTIONS, defaultChrome, normalizeChrome, type WebTheme, type WebChrome } from '@/lib/webTheme';
import {
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Store,
  Sparkles,
  Palette,
  ShoppingBag,
  Search,
  Sliders,
  Check,
  ShieldCheck,
  Truck,
  MessageSquare,
  ImagePlus,
  Upload,
  Trash2,
  ArrowLeft,
  LayoutGrid
} from 'lucide-react';
import { WebStoreStatusBadge } from '@/components/web-store/WebStoreStatusBadge';
import { StorefrontPreviewButton } from '@/components/web-store/StorefrontPreviewButton';
import { WebStoreAiAssistant } from '@/components/web-store/WebStoreAiAssistant';
import type { AiChangeSuggestion } from '@/graphql/mutation/aiAssistant';

type StoreType = { id: string | number; name: string };

const COLOR_PRESETS = [
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Royal Purple', hex: '#8b5cf6' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Midnight', hex: '#1e293b' },
];

export default function OwnerWebStoreSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ws, setWs] = useState<WebStore | null>(null);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [subdomainHash, setSubdomainHash] = useState('');
  const [themeColor, setThemeColor] = useState('#0ea5e9');
  // Tema global (font, warna, radius, custom CSS).
  const [theme, setTheme] = useState<WebTheme>(defaultTheme());
  // Header & Footer config global.
  const [chrome, setChrome] = useState<WebChrome>(defaultChrome());
  // Draft halaman untuk usulan AI; baru ditulis ke BE saat Save.
  const [draftPages, setDraftPages] = useState<WebPage[]>([]);
  const [pagesDirty, setPagesDirty] = useState(false);
  const [tagline, setTagline] = useState('');
  const [active, setActive] = useState(true);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState('');
  const [notifyTelegram, setNotifyTelegram] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);

  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'om-bot.com';
  const subdomain = useMemo(() => subdomainHash || generateHash(storeName), [subdomainHash, storeName]);
  const fullUrl = `https://${subdomain}.${mainDomain}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
      if (!token) { setLoading(false); return; }
      try {
        const payload = decodeJwt(token);
        const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
        const [wsRes, storesRes] = await Promise.all([
          ownerId ? getWebStoreByOwner(ownerId, token) : Promise.resolve({ webStoreByOwner: null }),
          myStoresService(token).catch(() => ({ myStores: [] })),
        ]);
        if (cancelled) return;
        setWs(wsRes.webStoreByOwner);
        if (storesRes.myStores?.length) {
          setStores(storesRes.myStores);
        }
        if (wsRes.webStoreByOwner) {
          const w = wsRes.webStoreByOwner;
          setSelectedStoreId(String(w.store_id));
          setStoreName(w.store_name);
          setSubdomainHash(w.subdomain_hash ?? '');
          setThemeColor(w.theme_color ?? '#0ea5e9');
          // Tema global dari settings.theme (fallback default).
          setTheme(normalizeTheme((w.settings as any)?.theme ?? null));
          // Header & Footer config dari settings.chrome.
          setChrome(normalizeChrome((w.settings as any)?.chrome ?? null));
          setTagline(w.tagline ?? '');
          setActive(!!w.is_active);
          setCustomDomain(w.custom_domain ?? '');
          setNotifyWhatsapp(w.notify_whatsapp ?? '');
          setNotifyTelegram(w.notify_telegram ?? '');
          setPaymentMethods(w.payment_methods ?? []);
          setShippingMethods(w.shipping_methods ?? []);
          setDraftPages(w.pages ?? []);
          setPagesDirty(false);
          if (w.store?.id && !storesRes.myStores?.some((s: any) => String(s.id) === String(w.store?.id))) {
            setStores((prev) => [...prev, { id: w.store!.id, name: w.store!.name }]);
          }
        } else if (storesRes.myStores?.length) {
          setSelectedStoreId(String(storesRes.myStores[0].id));
          setStoreName(storesRes.myStores[0].name);
        }
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', msg: e?.message ?? 'Gagal memuat data' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function applyAiChanges(changes: AiChangeSuggestion[]) {
    for (const change of changes) {
      if ((change.field === 'theme' || change.field === 'web_store.theme') && change.to && typeof change.to === 'object') {
        setTheme((prev) => normalizeTheme({ ...prev, ...(change.to as Record<string, unknown>) }));
      } else if ((change.field === 'chrome' || change.field === 'web_store.chrome') && change.to && typeof change.to === 'object') {
        setChrome((prev) => normalizeChrome({ ...prev, ...(change.to as Record<string, unknown>) }));
      } else if ((change.field === 'theme_color' || change.field === 'web_store.theme_color') && typeof change.to === 'string') {
        setThemeColor(change.to);
      } else if (change.field === 'pages' && Array.isArray(change.to)) {
        setDraftPages(change.to as WebPage[]);
        setPagesDirty(true);
      } else if (change.field.startsWith('page:') && change.to && typeof change.to === 'object') {
        const value = change.to as { slug?: string; blocks?: WebPage['blocks']; title?: string; is_published?: boolean };
        setDraftPages((prev) => prev.map((p) => p.slug === change.field.slice(5) ? { ...p, ...value } : p));
        setPagesDirty(true);
      }
    }
    setStatus({ kind: 'ok', msg: 'Usulan AI diterapkan ke draft. Klik Simpan Perubahan untuk menyimpan.' });
  }

  async function save() {
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    if (!selectedStoreId) return setStatus({ kind: 'err', msg: 'Silakan pilih store sumber terlebih dahulu.' });
    if (!storeName.trim()) return setStatus({ kind: 'err', msg: 'Nama Web Store wajib diisi.' });
    setSaving(true);
    try {
      const res = await upsertWebStore(token, {
        store_id: selectedStoreId,
        slug: ws?.slug ?? null,
        subdomain_hash: subdomain || null,
        store_name: storeName.trim(),
        theme_color: themeColor,
        tagline: tagline || null,
        is_active: active,
        settings: {
          ...(ws?.settings ?? {}),
          shipping_methods: shippingMethods,
          theme,
          chrome,
        },
        payment_methods: paymentMethods,
        custom_domain: customDomain.trim() || null,
        notify_whatsapp: notifyWhatsapp.trim() || null,
        notify_telegram: notifyTelegram.trim() || null,
      });
      setWs(res.upsertWebStore);
      setSubdomainHash(res.upsertWebStore.subdomain_hash ?? '');
      if (pagesDirty && draftPages.length > 0) {
        await Promise.all(draftPages.map((p) => upsertWebPage(token, {
          id: p.id,
          slug: p.slug,
          title: p.title,
          blocks: p.blocks,
          is_published: p.is_published,
        })));
        setPagesDirty(false);
      }
      setStatus({ kind: 'ok', msg: 'Konfigurasi Web Store berhasil disimpan!' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan perubahan' });
    } finally {
      setSaving(false);
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpload(collection: 'logo' | 'banner', file?: File | null) {
    if (!file) return;
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    setUploading(collection);
    setStatus(null);
    try {
      const res = await uploadWebStoreMedia(token, collection, file);
      setWs((prev) =>
        prev ? { ...prev, ...res.uploadWebStoreMedia } : prev,
      );
      setStatus({ kind: 'ok', msg: `${collection === 'logo' ? 'Logo' : 'Banner'} berhasil diunggah!` });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal unggah media' });
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke Management Merchant
        </Link>
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-medium">Menyiapkan Web Store Studio...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          {/* Back to merchant management */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Kembali ke Management Merchant
          </Link>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30 backdrop-blur-sm">
              <Sparkles size={14} className="text-blue-400" /> E-Commerce Builder Phase 1
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Web Store Setup Studio</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
              Atur domain, nama toko, identitas visual, dan warna tema toko online Anda secara real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {ws && <WebStoreStatusBadge active={ws.is_active} />}
            <StorefrontPreviewButton hash={subdomain} isActive={active} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Sliders size={20} className="text-blue-600" /> Konfigurasi Toko Online
            </h2>

            {/* Field 1: Store Sumber */}
            <Field label="Store Fisik Sumber Inventaris *" icon={<Store size={16} className="text-slate-400" />}>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                <option value="">— Pilih Toko Fisik —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                {ws?.store && !stores.find((s) => String(s.id) === String(ws.store!.id)) && (
                  <option value={ws.store.id}>{ws.store.name}</option>
                )}
              </select>
              <p className="text-xs text-slate-500 mt-1.5 leading-normal">
                Toko fisik yang menjadi sumber stok barang & pemrosesan pesanan storefront.
              </p>
            </Field>

            {/* Field 2: Nama Web Store */}
            <Field label="Nama Web Store" icon={<Globe size={16} className="text-slate-400" />}>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Toko Budi Official Store"
              />
            </Field>

            {/* Field 3: Subdomain URL */}
            <Field label="Subdomain URL Public" icon={<Sparkles size={16} className="text-slate-400" />}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    value={subdomain}
                    onChange={(e) => setSubdomainHash(e.target.value.replace(/[^a-z0-9]/g, '').slice(0, 16))}
                    placeholder="tokobudi"
                  />
                </div>
                <span className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-mono text-xs font-bold border border-slate-200">
                  .{mainDomain}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  Subdomain publik (4–16 karakter alphanumeric).
                </p>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? 'Tersalin!' : 'Salin URL'}
                </button>
              </div>
            </Field>

            {/* Field 4: Tagline */}
            <Field label="Tagline / Slogan Toko" icon={<Sparkles size={16} className="text-slate-400" />}>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Produk Berkualitas dengan Pelayanan Tercepat"
              />
            </Field>

            {/* Field 5: Theme Color & Presets */}
            <Field label="Warna Aksensuasi Tema Storefront" icon={<Palette size={16} className="text-slate-400" />}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      className="w-12 h-11 rounded-xl border border-slate-300 cursor-pointer overflow-hidden p-1 bg-white"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                    />
                  </div>
                  <input
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Preset:</span>
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setThemeColor(p.hex)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        themeColor.toLowerCase() === p.hex.toLowerCase()
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm scale-105'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: p.hex }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            {/* Field 6: Logo & Banner */}
            <Field label="Logo & Banner Storefront" icon={<ImagePlus size={16} className="text-slate-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['logo', 'banner'] as const).map((col) => {
                  const url = col === 'logo' ? ws?.logo_url : ws?.banner_url;
                  return (
                    <div key={col} className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {col === 'logo' ? 'Logo' : 'Banner'}
                        </span>
                        {url && (
                          <button
                            type="button"
                            onClick={() => handleUpload(col, null)}
                            className="text-[10px] text-rose-500 hover:underline"
                            title="Unggah ulang (ganti)"
                          >
                            <Trash2 size={12} className="inline mr-1" />Ganti
                          </button>
                        )}
                      </div>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={col}
                          className="h-24 w-full object-contain rounded-lg bg-white border"
                        />
                      ) : (
                        <div className="h-24 rounded-lg bg-white border flex items-center justify-center text-slate-400">
                          <ImagePlus size={20} />
                        </div>
                      )}
                      <label className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-slate-700 disabled:opacity-50">
                        <Upload size={12} />
                        {uploading === col ? 'Mengunggah…' : url ? 'Ganti File' : 'Unggah File'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading !== null}
                          onChange={(e) => handleUpload(col, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Logo tampil di header toko, banner di halaman depan storefront (PNG/JPG).
              </p>
            </Field>

            {/* Field 6.5: Tampilan Global (Tema) */}
            <Field label="Tampilan Global (Font, Warna, CSS Kustom)" icon={<Palette size={16} className="text-slate-400" />}>
              <div className="space-y-4">
                {/* Preset tema */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preset Tema</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
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
                          onClick={() => setTheme({ ...theme, ...p.theme, custom_css: theme.custom_css })}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: p.theme.colors.brand }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Font</span>
                  <select
                    value={theme.font}
                    onChange={(e) => setTheme({ ...theme, font: e.target.value })}
                    className="mt-1.5 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Warna */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    ['brand', 'Warna Brand'],
                    ['bg', 'Latar'],
                    ['text', 'Teks'],
                    ['muted', 'Teks Redup'],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="color"
                          value={theme.colors[key]}
                          onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={theme.colors[key]}
                          onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, [key]: e.target.value } })}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Radius & tombol */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Radius Sudut (px)</span>
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={theme.radius}
                      onChange={(e) => setTheme({ ...theme, radius: Number(e.target.value) || 0 })}
                      className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gaya Tombol</span>
                    <select
                      value={theme.buttonStyle}
                      onChange={(e) => setTheme({ ...theme, buttonStyle: e.target.value as WebTheme['buttonStyle'] })}
                      className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                    >
                      <option value="rounded">Membulat</option>
                      <option value="pill">Pill</option>
                      <option value="square">Kotak</option>
                    </select>
                  </div>
                </div>

                {/* Custom CSS */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CSS Kustom (lanjutan)</span>
                    <span className="text-[10px] text-slate-400">Opsional — untuk power user</span>
                  </div>
                  <textarea
                    value={theme.custom_css}
                    onChange={(e) => setTheme({ ...theme, custom_css: e.target.value })}
                    rows={6}
                    spellCheck={false}
                    placeholder={'.hero-title { font-size: 48px; }'}
                    className="mt-1.5 w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    CSS ini berlaku di seluruh halaman storefront. Pakai variabel seperti <code className="text-slate-500">var(--brand)</code> bila perlu.
                  </p>
                </div>
              </div>
            </Field>

            {/* Field 6.6: Header & Footer */}
            <Field label="Header & Footer (Global)" icon={<LayoutGrid size={16} className="text-slate-400" />}>
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Header</span>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      ['show_search', 'Tampilkan pencarian'],
                      ['show_feature_strip', 'Tampilkan strip info'],
                      ['show_orders', 'Tampilkan link Pesanan'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={chrome.header[key]}
                          onChange={(e) => setChrome({ ...chrome, header: { ...chrome.header, [key]: e.target.checked } })}
                          className="w-4 h-4 accent-blue-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Footer</span>
                  <div className="mt-2 space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">Teks Tentang Toko</span>
                      <textarea
                        value={chrome.footer.about_text}
                        onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, about_text: e.target.value } })}
                        rows={2}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Deskripsi singkat toko di footer..."
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">Teks Hak Cipta (kosong = otomatis)</span>
                      <input
                        type="text"
                        value={chrome.footer.copyright_text}
                        onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, copyright_text: e.target.value } })}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="© 2026 Toko Saya"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">Badge Pembayaran (pisahkan dengan koma)</span>
                      <input
                        type="text"
                        value={chrome.footer.payments.join(', ')}
                        onChange={(e) => setChrome({
                          ...chrome,
                          footer: {
                            ...chrome.footer,
                            payments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        })}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="BCA, QRIS, COD, Gopay"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">Sosial Media (opsional)</span>
                      <div className="mt-1 space-y-2">
                        {chrome.footer.socials.map((s, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={s.platform}
                              onChange={(e) => {
                                const socials = [...chrome.footer.socials];
                                socials[i] = { ...s, platform: e.target.value };
                                setChrome({ ...chrome, footer: { ...chrome.footer, socials } });
                              }}
                              placeholder="Instagram"
                              className="w-1/3 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                              type="text"
                              value={s.url}
                              onChange={(e) => {
                                const socials = [...chrome.footer.socials];
                                socials[i] = { ...s, url: e.target.value };
                                setChrome({ ...chrome, footer: { ...chrome.footer, socials } });
                              }}
                              placeholder="https://instagram.com/toko"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setChrome({
                                ...chrome,
                                footer: { ...chrome.footer, socials: chrome.footer.socials.filter((_, j) => j !== i) },
                              })}
                              className="px-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              aria-label="Hapus sosial"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setChrome({
                            ...chrome,
                            footer: { ...chrome.footer, socials: [...chrome.footer.socials, { platform: '', url: '' }] },
                          })}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          + Tambah sosial media
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chrome.footer.show_powered_by}
                        onChange={(e) => setChrome({ ...chrome, footer: { ...chrome.footer, show_powered_by: e.target.checked } })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      Tampilkan "Powered by om-bot.com"
                    </label>
                  </div>
                </div>
              </div>
            </Field>

            <Field label="Metode Pembayaran & Notifikasi" icon={<ShieldCheck size={16} className="text-slate-400" />}>
              <div className="space-y-4">
                {/* Payment methods list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Metode Pembayaran (customer pilih di checkout)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentMethods((prev) => [
                          ...prev,
                          {
                            id: `pm_new_${Date.now()}`,
                            type: 'bank_transfer',
                            name: 'Bank Transfer',
                            bank_name: '',
                            account_number: '',
                            account_name: '',
                            instructions: '',
                            is_free: true,
                            enabled: true,
                          },
                        ])
                      }
                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      + Tambah Metode
                    </button>
                  </div>

                  {paymentMethods.length === 0 && (
                    <p className="rounded-lg border border-dashed p-3 text-center text-xs text-slate-400">
                      Belum ada metode. Tambahkan minimal satu (Bank Transfer gratis bawaan direkomendasikan).
                    </p>
                  )}

                  {paymentMethods.map((pm, idx) => (
                    <div key={pm.id ?? idx} className="rounded-xl border bg-slate-50/70 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className="rounded bg-white border px-1.5 py-0.5">{pm.type === 'bank_transfer' ? '🏦' : pm.type === 'ewallet' ? '📱' : '💵'}</span>
                          Metode #{idx + 1}
                          <label className="ml-2 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <input type="checkbox" checked={pm.enabled} onChange={(e) => {
                              const next = [...paymentMethods];
                              next[idx] = { ...pm, enabled: e.target.checked };
                              setPaymentMethods(next);
                            }} /> Aktif
                          </label>
                          <label className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <input type="checkbox" checked={pm.is_free} onChange={(e) => {
                              const next = [...paymentMethods];
                              next[idx] = { ...pm, is_free: e.target.checked };
                              setPaymentMethods(next);
                            }} /> Gratis
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentMethods((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="rounded-lg border px-2 py-1.5 text-xs"
                          value={pm.type}
                          onChange={(e) => {
                            const next = [...paymentMethods];
                            next[idx] = { ...pm, type: e.target.value };
                            setPaymentMethods(next);
                          }}
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="ewallet">E-Wallet</option>
                          <option value="cod">COD</option>
                        </select>
                        <input
                          className="rounded-lg border px-2 py-1.5 text-xs"
                          placeholder="Nama (cth: Bank BCA)"
                          value={pm.name ?? ''}
                          onChange={(e) => {
                            const next = [...paymentMethods];
                            next[idx] = { ...pm, name: e.target.value };
                            setPaymentMethods(next);
                          }}
                        />
                        {pm.type !== 'cod' && (
                          <>
                            <input
                              className="rounded-lg border px-2 py-1.5 text-xs"
                              placeholder="Bank / Provider"
                              value={pm.bank_name ?? ''}
                              onChange={(e) => {
                                const next = [...paymentMethods];
                                next[idx] = { ...pm, bank_name: e.target.value };
                                setPaymentMethods(next);
                              }}
                            />
                            <input
                              className="rounded-lg border px-2 py-1.5 text-xs"
                              placeholder="Nomor rekening / ID"
                              value={pm.account_number ?? ''}
                              onChange={(e) => {
                                const next = [...paymentMethods];
                                next[idx] = { ...pm, account_number: e.target.value };
                                setPaymentMethods(next);
                              }}
                            />
                            <input
                              className="col-span-2 rounded-lg border px-2 py-1.5 text-xs"
                              placeholder="Atas nama (opsional)"
                              value={pm.account_name ?? ''}
                              onChange={(e) => {
                                const next = [...paymentMethods];
                                next[idx] = { ...pm, account_name: e.target.value };
                                setPaymentMethods(next);
                              }}
                            />
                          </>
                        )}
                        <input
                          className="col-span-2 rounded-lg border px-2 py-1.5 text-xs"
                          placeholder="Instruksi tambahan (opsional)"
                          value={pm.instructions ?? ''}
                          onChange={(e) => {
                            const next = [...paymentMethods];
                            next[idx] = { ...pm, instructions: e.target.value };
                            setPaymentMethods(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notifikasi WA (nomor owner)</label>
                    <input
                      className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="08xxxxxxxxxx"
                      value={notifyWhatsapp}
                      onChange={(e) => setNotifyWhatsapp(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Order baru terkirim ke WhatsApp nomor ini.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notifikasi Telegram (chat ID)</label>
                    <input
                      className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="123456789"
                      value={notifyTelegram}
                      onChange={(e) => setNotifyTelegram(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Order baru terkirim ke Telegram chat ini.</p>
                  </div>
                </div>

                {/* Custom domain */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Domain Kustom (opsional)</label>
                  <input
                    className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    placeholder="tokoanda.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Kosongkan untuk memakai subdomain otomatis ({mainDomain}). Arahkan DNS A ke server Anda bila memakai domain kustom.
                  </p>
                </div>
              </div>
            </Field>

            {/* Field 8: Metode Ongkir */}
            <Field label="Metode Ongkir" icon={<Truck size={16} className="text-slate-400" />}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Metode Pengiriman (cost dihitung otomatis saat checkout)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setShippingMethods((prev) => [
                        ...prev,
                        { id: `ship_${Date.now()}`, name: 'Ongkir Flat', cost: 15000, per_km: null, min_cost: null, min_order: null, enabled: true },
                      ])
                    }
                    className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    + Tambah Metode
                  </button>
                </div>

                {shippingMethods.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-slate-400">
                    Belum ada metode. Biarkan kosong untuk ongkir gratis pada semua pesanan.
                  </p>
                )}
                {shippingMethods.length > 0 && (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ongkir terendah yang memenuhi syarat akan dipakai. <span className="font-mono">flat</span> = tarif tetap,{' '}
                    <span className="font-mono">distance</span> = per km (minimal <span className="font-mono">min_cost</span>),{' '}
                    <span className="font-mono">free</span> = gratis bila pesanan di atas <span className="font-mono">min_order</span>.
                  </p>
                )}

                {shippingMethods.map((sm, idx) => (
                  <div key={sm.id ?? idx} className="rounded-xl border bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="rounded bg-white border px-1.5 py-0.5">🚚</span>
                        Metode #{idx + 1}
                        <label className="ml-2 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                          <input
                            type="checkbox"
                            checked={sm.enabled}
                            onChange={(e) => {
                              const next = [...shippingMethods];
                              next[idx] = { ...sm, enabled: e.target.checked };
                              setShippingMethods(next);
                            }}
                          /> Aktif
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShippingMethods((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="rounded-lg border px-2 py-1.5 text-xs"
                        value={sm.id}
                        onChange={(e) => {
                          const next = [...shippingMethods];
                          next[idx] = { ...sm, id: e.target.value };
                          setShippingMethods(next);
                        }}
                      >
                        <option value="flat">Flat (tarif tetap)</option>
                        <option value="distance">Distance (per km)</option>
                        <option value="free">Free (gratis min order)</option>
                      </select>
                      <input
                        className="rounded-lg border px-2 py-1.5 text-xs"
                        placeholder="Nama (cth: GoSend Instant)"
                        value={sm.name ?? ''}
                        onChange={(e) => {
                          const next = [...shippingMethods];
                          next[idx] = { ...sm, name: e.target.value };
                          setShippingMethods(next);
                        }}
                      />
                      {sm.id === 'flat' && (
                        <input
                          className="rounded-lg border px-2 py-1.5 text-xs"
                          type="number"
                          min={0}
                          placeholder="Biaya tetap (Rp)"
                          value={sm.cost ?? ''}
                          onChange={(e) => {
                            const next = [...shippingMethods];
                            next[idx] = { ...sm, cost: e.target.value === '' ? null : Number(e.target.value) };
                            setShippingMethods(next);
                          }}
                        />
                      )}
                      {sm.id === 'distance' && (
                        <>
                          <input
                            className="rounded-lg border px-2 py-1.5 text-xs"
                            type="number"
                            min={0}
                            placeholder="Tarif per km (Rp)"
                            value={sm.per_km ?? ''}
                            onChange={(e) => {
                              const next = [...shippingMethods];
                              next[idx] = { ...sm, per_km: e.target.value === '' ? null : Number(e.target.value) };
                              setShippingMethods(next);
                            }}
                          />
                          <input
                            className="rounded-lg border px-2 py-1.5 text-xs"
                            type="number"
                            min={0}
                            placeholder="Biaya minimal (Rp)"
                            value={sm.min_cost ?? ''}
                            onChange={(e) => {
                              const next = [...shippingMethods];
                              next[idx] = { ...sm, min_cost: e.target.value === '' ? null : Number(e.target.value) };
                              setShippingMethods(next);
                            }}
                          />
                        </>
                      )}
                      {sm.id === 'free' && (
                        <input
                          className="rounded-lg border px-2 py-1.5 text-xs"
                          type="number"
                          min={0}
                          placeholder="Min. order (Rp)"
                          value={sm.min_order ?? ''}
                          onChange={(e) => {
                            const next = [...shippingMethods];
                            next[idx] = { ...sm, min_order: e.target.value === '' ? null : Number(e.target.value) };
                            setShippingMethods(next);
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            {/* Field 9: Status Activation */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <div>
                  <span className="block text-sm font-bold text-slate-900">Status Akses Publik Web Store</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {active ? 'Aktif — Toko online dapat diakses langsung oleh pembeli.' : 'Nonaktif — Hanya dapat diakses untuk peninjauan internal.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
              </label>
            </div>

            {/* Status Alert Notification */}
            {status && (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all animate-in fade-in ${
                  status.kind === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {status.kind === 'ok' ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} /> : <AlertCircle className="shrink-0 text-rose-600" size={20} />}
                {status.msg}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                {ws ? 'Simpan Perubahan' : 'Buat Web Store Baru'}
              </button>

              <StorefrontPreviewButton hash={subdomain} isActive={active} />
            </div>
          </div>
        </div>

        <WebStoreAiAssistant
          context={{
            store: { name: storeName, tagline, themeColor },
            theme,
            chrome,
            pages: ws?.pages ?? [],
          }}
          onApply={applyAiChanges}
        />

        {/* Right Panel: Interactive Real-Time Storefront Mockup */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe size={14} className="text-blue-600" /> Live Storefront Preview
            </span>
            <span className="text-[11px] font-medium text-slate-400">Tampilan Ponsel & Desktop</span>
          </div>

          {/* Browser Window Mockup */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all">
            {/* Browser Top Bar */}
            <div className="bg-slate-800/80 px-4 py-3 flex items-center gap-3 border-b border-slate-700/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 bg-slate-950/80 px-3 py-1 rounded-lg text-[11px] font-mono text-slate-400 flex items-center justify-between border border-slate-800 truncate">
                <span className="truncate">https://{subdomain}.{mainDomain}</span>
                <ShieldCheck size={12} className="text-emerald-400 shrink-0 ml-1" />
              </div>
            </div>

            {/* Storefront Page Content Mockup */}
            <div className="bg-slate-50 text-slate-900 min-h-[460px] flex flex-col font-sans">
              {/* Navbar Mockup */}
              <div className="px-4 py-3 text-white flex items-center justify-between shadow-md" style={{ backgroundColor: themeColor }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                    {storeName ? storeName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="font-bold text-sm tracking-tight truncate max-w-[140px]">
                    {storeName || 'Nama Web Store'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <Search size={16} />
                  <div className="relative">
                    <ShoppingBag size={16} />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[9px] font-bold flex items-center justify-center">
                      2
                    </span>
                  </div>
                </div>
              </div>

              {/* Hero Banner Mockup */}
              <div className="p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}, #0f172a)` }}>
                <div className="relative z-10 space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-white/20 text-[10px] font-semibold tracking-wider uppercase">
                    Selamat Datang
                  </span>
                  <h3 className="text-base font-extrabold leading-tight">
                    {storeName || 'Toko Online Resmi'}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2">
                    {tagline || 'Pesan produk favorit Anda dengan mudah dan cepat.'}
                  </p>
                  <button
                    type="button"
                    className="mt-2 px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs shadow-sm hover:bg-slate-100"
                  >
                    Lihat Katalog Produk
                  </button>
                </div>
              </div>

              {/* Product Cards Grid Mockup */}
              <div className="p-4 space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Produk Unggulan</span>
                  <span className="text-[10px] text-slate-400 font-medium">Lihat Semua</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Sample Card 1 */}
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-sm space-y-2">
                    <div className="h-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 font-medium text-xs">
                      Gambar Produk
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate">Es Teh Jumbo</div>
                      <div className="text-[11px] font-extrabold mt-0.5" style={{ color: themeColor }}>
                        Rp 15.000
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full py-1 rounded-lg text-white font-semibold text-[10px] shadow-sm"
                      style={{ backgroundColor: themeColor }}
                    >
                      + Tambah Cart
                    </button>
                  </div>

                  {/* Sample Card 2 */}
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-sm space-y-2">
                    <div className="h-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 font-medium text-xs">
                      Gambar Produk
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate">Pisang Goreng Crispy</div>
                      <div className="text-[11px] font-extrabold mt-0.5" style={{ color: themeColor }}>
                        Rp 10.000
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full py-1 rounded-lg text-white font-semibold text-[10px] shadow-sm"
                      style={{ backgroundColor: themeColor }}
                    >
                      + Tambah Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Storefront Footer Features Mockup */}
              <div className="bg-white border-t border-slate-200 p-3 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600">
                <div className="flex flex-col items-center gap-1">
                  <Truck size={14} className="text-slate-400" />
                  <span>Pengiriman Cepat</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={14} className="text-slate-400" />
                  <span>Terpercaya</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MessageSquare size={14} className="text-slate-400" />
                  <span>Order via WA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
        {icon}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

function generateHash(input: string): string {
  const base = (input || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  if (base) return base;
  return Math.random().toString(36).slice(2, 8);
}
