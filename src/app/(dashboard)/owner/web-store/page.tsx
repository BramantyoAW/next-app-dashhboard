'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getWebStoreByOwner, shippingMethodKind, SEARCH_DESTINATIONS, type Destination } from '@/graphql/query/webstore';
import { upsertWebStore, upsertWebPage, uploadWebStoreMedia } from '@/graphql/mutation/webstore';
import { myStoresService } from '@/graphql/query/myStores';
import { gqlFetch } from '@/lib/graphqlClient';
import { LocationPicker } from '@/components/map/LocationPicker';
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
  Check,
  ShieldCheck,
  Truck,
  MapPin,
  ImagePlus,
  Upload,
  Trash2,
  ArrowLeft,
  LayoutGrid,
  LayoutTemplate,
  Settings,
  FileCode,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import type { DomainProbe } from '@/lib/domainProbe';
import { WebStoreStatusBadge } from '@/components/web-store/WebStoreStatusBadge';
import { StorefrontPreviewButton } from '@/components/web-store/StorefrontPreviewButton';
import OmBotAiAssistance from '@/components/ai-ops/OmBotAiAssistance';
import { openAiPanel } from '@/lib/aiPanelBus';

/**
 * Kurir yang bisa dipilih merchant untuk metode ekspedisi.
 *
 * Hanya kode yang memang didukung API RajaOngkir. Tiap kurir yang dicentang
 * menambah satu panggilan API berbayar setiap kali tarif dihitung, jadi
 * daftarnya sengaja tidak panjang.
 */
const KURIR_EKSPEDISI = [
  { kode: 'jne', nama: 'JNE' },
  { kode: 'jnt', nama: 'J&T' },
  { kode: 'sicepat', nama: 'SiCepat' },
  { kode: 'anteraja', nama: 'AnterAja' },
  { kode: 'pos', nama: 'POS Indonesia' },
];

type StoreType = {
  id: string | number;
  name: string;
  // Titik & jangkauan outlet untuk pengiriman instan. Null = belum dipetakan.
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number | null;
  is_open?: boolean | null;
  // Kecamatan asal paket ekspedisi (RajaOngkir). Dipisah dari lat/lng karena
  // ekspedisi hanya menerima ID kecamatan, sedangkan kurir instan memakai titik.
  origin_destination_id?: number | null;
  origin_destination_label?: string | null;
};

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
  // Referensi internal untuk create/update; bukan konfigurasi sumber inventory.
  // Relasi fisik internal untuk pembuatan webstore baru; bukan sumber inventory.
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
  // Pemetaan lokasi outlet: titik & radius layanan untuk pengiriman instan.
  const [lokasiStoreId, setLokasiStoreId] = useState('');
  const [lokasiCoords, setLokasiCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lokasiRadius, setLokasiRadius] = useState('10');
  // Kecamatan asal paket ekspedisi. Terpisah dari titik peta karena RajaOngkir
  // hanya menerima ID kecamatan — titik saja tidak cukup untuk ekspedisi.
  const [lokasiOrigin, setLokasiOrigin] = useState<{ id: number; label: string } | null>(null);
  const [originKata, setOriginKata] = useState('');
  const [originHasil, setOriginHasil] = useState<Destination[]>([]);
  const [originPesan, setOriginPesan] = useState<string | null>(null);
  const [lokasiSaving, setLokasiSaving] = useState(false);
  const [lokasiMsg, setLokasiMsg] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState<string>('none');
  // Instruksi record DNS dari backend: token TXT tidak bisa ditebak merchant,
  // jadi harus ditampilkan apa adanya untuk disalin.
  const [customDomainDns, setCustomDomainDns] = useState<
    { type: string; name: string; value: string; note?: string }[]
  >([]);
  // Keterjangkauan domain diukur lewat permintaan HTTP, bukan dari
  // custom_domain_status. Kolom itu pernah berstatus `active` padahal apex
  // domainnya tidak punya record sama sekali (demostore-ombot.my.id).
  const [domainProbe, setDomainProbe] = useState<DomainProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState('');
  const [notifyTelegram, setNotifyTelegram] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [mtServerKey, setMtServerKey] = useState('');
  const [mtClientKey, setMtClientKey] = useState('');
  const [mtIsProduction, setMtIsProduction] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [activeTab, setActiveTab] = useState<'toko' | 'tema' | 'pembayaran' | 'pengiriman' | 'lanjutan'>('toko');

  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'om-bot.com';
  const subdomain = useMemo(() => subdomainHash || generateHash(storeName), [subdomainHash, storeName]);
  const fullUrl = `https://${subdomain}.${mainDomain}`;

  /**
   * Domain bawaan hanya dimatikan kalau domain kustom benar-benar menjawab.
   * Dua alamat hidup sekaligus membuat mesin pencari dan pembeli melihat toko
   * ganda, jadi keputusannya diambil dari hasil probe, bukan dari status DB.
   */
  const defaultDomainDisabled =
    customDomainStatus === 'active' && Boolean(domainProbe?.live);

  const refreshDomainProbe = async (host: string) => {
    const target = host.trim();
    if (!target) return;
    setProbing(true);
    try {
      const res = await fetch(`/api/domain-status?host=${encodeURIComponent(target)}`, {
        cache: 'no-store',
      });
      if (res.ok) setDomainProbe(await res.json());
    } catch {
      setDomainProbe(null);
    } finally {
      setProbing(false);
    }
  };

  // Periksa sekali saat halaman dibuka supaya indikator langsung terisi tanpa
  // merchant harus menekan tombol.
  useEffect(() => {
    if (customDomainStatus === 'active' && customDomain.trim()) {
      refreshDomainProbe(customDomain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDomainStatus]);

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
          setCustomDomainStatus(w.custom_domain_status ?? 'none');
          setCustomDomainDns((w as any).custom_domain_dns ?? []);
          setNotifyWhatsapp(w.notify_whatsapp ?? '');
          setNotifyTelegram(w.notify_telegram ?? '');
          setPaymentMethods(w.payment_methods ?? []);
          const mt = (w.settings as any)?.midtrans ?? null;
          setMtServerKey(mt?.server_key ?? '');
          setMtClientKey(mt?.client_key ?? '');
          setMtIsProduction(!!mt?.is_production);
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

  /**
   * Pilih outlet → isi titik & radius yang tersimpan ke dalam form.
   *
   * Titik disimpan di tabel `stores` (bukan di settings web store), karena satu
   * owner bisa punya beberapa outlet dengan jangkauan berbeda.
   */
  function pilihOutletUntukLokasi(storeId: string) {
    setLokasiStoreId(storeId);
    setLokasiMsg(null);
    const s = stores.find((x) => String(x.id) === storeId);
    if (!s) {
      setLokasiCoords(null);
      return;
    }
    setLokasiCoords(
      typeof s.latitude === 'number' && typeof s.longitude === 'number'
        ? { lat: s.latitude, lng: s.longitude }
        : null,
    );
    setLokasiRadius(String(s.radius_km ?? 10));
    // Kecamatan asal yang sudah tersimpan ikut dimuat. Tanpa ini, membuka
    // panel lalu menekan simpan akan MENGHAPUS kecamatan asal yang sudah
    // diatur — karena form mengira merchant belum memilih apa pun.
    setLokasiOrigin(
      s.origin_destination_id && s.origin_destination_label
        ? { id: s.origin_destination_id, label: s.origin_destination_label }
        : null,
    );
    setOriginKata('');
    setOriginHasil([]);
    setOriginPesan(null);
  }

  /**
   * Pencarian kecamatan asal ekspedisi.
   *
   * Ditunda 400 ms dengan minimal 3 huruf: tiap ketikan memicu satu permintaan
   * ke RajaOngkir, dan backend menolak kata kunci di bawah 3 huruf.
   */
  useEffect(() => {
    const kata = originKata.trim();
    if (kata.length < 3) {
      setOriginHasil([]);
      setOriginPesan(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
      gqlFetch<{ searchDestinations: Destination[] }>(SEARCH_DESTINATIONS, { keyword: kata, limit: 8 }, token)
        .then((d) => {
          if (cancelled) return;
          const hasil = d?.searchDestinations ?? [];
          setOriginHasil(hasil);
          setOriginPesan(hasil.length === 0 ? 'Kecamatan tidak ditemukan.' : null);
        })
        .catch(() => {
          if (!cancelled) {
            setOriginHasil([]);
            // Daftar kosong bisa berarti API key kurir belum dipasang. Pesannya
            // netral supaya merchant tidak menyangka outletnya yang salah.
            setOriginPesan('Pencarian kecamatan sedang tidak tersedia.');
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [originKata]);

  async function simpanLokasiOutlet() {
    setLokasiMsg(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setLokasiMsg({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    if (!lokasiStoreId) return setLokasiMsg({ kind: 'err', msg: 'Pilih outlet dulu.' });
    if (!lokasiCoords && !lokasiOrigin) {
      return setLokasiMsg({ kind: 'err', msg: 'Tentukan titik outlet di peta, atau pilih kecamatan asal ekspedisi.' });
    }

    // Titik peta hanya wajib untuk kurir instan. Merchant yang hanya memakai
    // ekspedisi tetap butuh menyimpan kecamatan asal, dan memaksa mereka
    // menaruh pin lebih dulu akan memblokir pengaturan yang sah.
    const butuhTitik = !lokasiOrigin;

    const radius = Number(lokasiRadius);
    if (butuhTitik && (!Number.isFinite(radius) || radius <= 0)) {
      return setLokasiMsg({ kind: 'err', msg: 'Radius harus lebih besar dari 0 km.' });
    }

    setLokasiSaving(true);
    try {
      const res = await gqlFetch<{
        updateStoreSettings: {
          id: string;
          latitude: number | null;
          longitude: number | null;
          radius_km: number | null;
          origin_destination_id: number | null;
          origin_destination_label: string | null;
        };
      }>(
        `mutation($id: ID!, $input: UpdateStoreSettingsInput!) {
          updateStoreSettings(store_id: $id, input: $input) {
            id latitude longitude radius_km origin_destination_id origin_destination_label
          }
        }`,
        {
          id: lokasiStoreId,
          input: {
            // Titik & radius hanya dikirim bila ada: kurir instan memakainya,
            // sedangkan toko ekspedisi-saja tidak perlu pin.
            ...(lokasiCoords
              ? { latitude: lokasiCoords.lat, longitude: lokasiCoords.lng, radius_km: radius }
              : {}),
            // Selalu dikirim (termasuk null) supaya merchant bisa MENGOSONGKAN
            // kecamatan asal yang salah, bukan terjebak dengannya.
            origin_destination_id: lokasiOrigin?.id ?? null,
            origin_destination_label: lokasiOrigin?.label ?? null,
          },
        },
        token,
      );

      const r = res?.updateStoreSettings;
      // Konfirmasi dari server, bukan asumsi lokal: kalau backend mengabaikan
      // nilai (mis. koordinat di luar rentang), merchant harus tahu.
      const titikGagalDisimpan = lokasiCoords !== null && (!r || r.latitude === null || r.longitude === null);
      const originGagalDisimpan = (lokasiOrigin?.id ?? null) !== (r?.origin_destination_id ?? null);

      if (!r || titikGagalDisimpan || originGagalDisimpan) {
        setLokasiMsg({
          kind: 'err',
          msg: titikGagalDisimpan
            ? 'Server tidak menyimpan titik ini. Periksa koordinatnya.'
            : 'Server tidak menyimpan kecamatan asal. Coba pilih ulang.',
        });
      } else {
        setStores((prev) =>
          prev.map((s) =>
            String(s.id) === lokasiStoreId
              ? {
                  ...s,
                  latitude: r.latitude,
                  longitude: r.longitude,
                  radius_km: r.radius_km,
                  origin_destination_id: r.origin_destination_id,
                  origin_destination_label: r.origin_destination_label,
                }
              : s,
          ),
        );
        setLokasiMsg({ kind: 'ok', msg: 'Lokasi, radius & kecamatan asal tersimpan.' });
      }
    } catch (e: unknown) {
      setLokasiMsg({ kind: 'err', msg: e instanceof Error ? e.message : 'Gagal menyimpan lokasi.' });
    } finally {
      setLokasiSaving(false);
    }
  }

  async function save() {
    setStatus(null);
    const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
    if (!token) return setStatus({ kind: 'err', msg: 'Sesi berakhir, silakan login ulang.' });
    if (!ws && !selectedStoreId) return setStatus({ kind: 'err', msg: 'Pilih outlet awal untuk membuat Web Store.' });
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
          midtrans: {
            server_key: mtServerKey.trim(),
            client_key: mtClientKey.trim(),
            is_production: mtIsProduction,
          },
        },
        payment_methods: paymentMethods,
        custom_domain: customDomain.trim() || null,
        notify_whatsapp: notifyWhatsapp.trim() || null,
        notify_telegram: notifyTelegram.trim() || null,
      });
      setWs(res.upsertWebStore);
      setCustomDomainStatus(res.upsertWebStore.custom_domain_status ?? 'none');
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Link href="/dashboard" className="ds-link inline-flex items-center gap-1.5 mb-4" style={{ fontSize: 13 }}>
          <ArrowLeft size={13} />
          Kembali ke Management Merchant
        </Link>
        <Loader2 className="animate-spin ds-accent-text" size={26} />
        <span className="ds-small">Menyiapkan Web Store Studio…</span>
      </div>
    );
  }

  const TAB_LIST = [
    { key: 'toko' as const, label: 'Toko', icon: Store },
    { key: 'pembayaran' as const, label: 'Pembayaran', icon: ShieldCheck },
    { key: 'pengiriman' as const, label: 'Pengiriman', icon: Truck },
    { key: 'lanjutan' as const, label: 'Lanjutan', icon: Settings },
  ];

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 48 }}>
      {/* Header — panel terang, bukan banner gelap. Kesan "alat kerja",
          bukan landing page. */}
      <header className="ds-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div style={{ minWidth: 260 }}>
            <Link
              href="/dashboard"
              className="ds-small inline-flex items-center gap-1.5"
              style={{ textDecoration: 'none', marginBottom: 8 }}
            >
              <ArrowLeft size={13} />
              Management Merchant
            </Link>
            <h1 className="ds-display" style={{ fontSize: 22, marginTop: 2 }}>
              Web Store Setup
            </h1>
            <p className="ds-small" style={{ marginTop: 4, maxWidth: 460 }}>
              Domain, identitas, pembayaran, dan pengiriman toko online Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ws && <WebStoreStatusBadge active={ws.is_active} />}
            <StorefrontPreviewButton hash={subdomain} isActive={active} />
            <button
              onClick={() => openAiPanel('web-store')}
              title="Tanya status web store ke Manage OmBot AI"
              className="ds-btn"
              data-variant="secondary"
            >
              <Sparkles size={14} /> Manage OmBot AI
            </button>
            <Link href="/owner/web-store/pages" className="ds-btn" data-variant="secondary">
              <LayoutTemplate size={14} /> Page Builder
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Settings */}
        <div className="lg:col-span-12 space-y-4">
          {/* Tab Navigation — segmented control */}
          <div
            className="flex gap-1"
            style={{
              background: 'var(--ds-surface-2)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius)',
              padding: 4,
            }}
          >
            {TAB_LIST.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex-1 inline-flex items-center justify-center gap-1.5"
                  style={{
                    borderRadius: 'var(--ds-radius-sm)',
                    padding: '7px 10px',
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    border: '1px solid transparent',
                    background: isActive ? 'var(--ds-surface)' : 'transparent',
                    color: isActive ? 'var(--ds-fg)' : 'var(--ds-fg-muted)',
                    boxShadow: isActive ? 'var(--ds-shadow)' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color .12s ease, color .12s ease',
                  }}
                >
                  <tab.icon size={13} style={{ color: isActive ? 'var(--ds-primary)' : 'inherit' }} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="ds-card" style={{ padding: 20 }}>
            <h2 className="ds-h1" style={{ marginBottom: 16 }}>
              {activeTab === 'toko' && <><Store size={17} className="ds-accent-text" /> Informasi Toko</>}
              {activeTab === 'pembayaran' && <><ShieldCheck size={17} className="ds-accent-text" /> Metode Pembayaran</>}
              {activeTab === 'pengiriman' && <><Truck size={17} className="ds-accent-text" /> Metode Pengiriman</>}
              {activeTab === 'lanjutan' && <><Settings size={17} className="ds-accent-text" /> Pengaturan Lanjutan</>}
            </h2>

            {activeTab === 'toko' && (<>
            {/* Relasi outlet awal hanya muncul saat membuat webstore baru. Produk dan stok storefront tetap berasal dari seluruh outlet owner. */}
            {!ws && (
              <Field label="Outlet Awal Web Store" icon={<Store size={16} className="ds-icon-muted" />}>
                <select
                  className="ds-input"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  <option value="">— Pilih outlet awal —</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <p className="ds-hint">
                  Hanya diperlukan saat membuat Web Store baru. Produk dan stok tetap berasal dari seluruh outlet milik owner.
                </p>
              </Field>
            )}

            <Field label="Nama Web Store" icon={<Globe size={16} className="ds-icon-muted" />}>
              <input
                className="ds-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Toko Budi Official Store"
              />
            </Field>

            {/* === Alamat toko ===
                Satu blok, urutan tetap: domain bawaan di atas, domain kustom
                di bawahnya. Begitu domain kustom terbukti bisa dibuka pembeli,
                domain bawaan dinonaktifkan supaya mesin pencari dan pembeli
                tidak melihat dua alamat untuk toko yang sama. */}
            <Field label="Domain Bawaan" icon={<Sparkles size={16} className="ds-icon-muted" />}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    className="ds-input font-mono"
                    value={subdomain}
                    disabled={defaultDomainDisabled}
                    onChange={(e) => setSubdomainHash(e.target.value.replace(/[^a-z0-9]/g, '').slice(0, 16))}
                    placeholder="tokobudi"
                  />
                </div>
                <span className="ds-suffix">
                  .{mainDomain}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="ds-small">
                  {defaultDomainDisabled
                    ? 'Dinonaktifkan — toko memakai domain kustom di bawah.'
                    : 'Subdomain publik (4–16 karakter alphanumeric).'}
                </p>
                {!defaultDomainDisabled && (
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="ds-link inline-flex items-center gap-1"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copied ? 'Tersalin!' : 'Salin URL'}
                  </button>
                )}
              </div>
            </Field>

            <Field label="Domain Kustom" icon={<Globe size={16} className="ds-icon-muted" />}>
              <input
                className="ds-input"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="toko-anda.com (opsional)"
              />

              {customDomain.trim() && (
                <div className="mt-2 flex flex-wrap items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 inline-block w-2 h-2 rounded-full shrink-0 ${
                      customDomainStatus === 'active'
                        ? 'bg-emerald-500'
                        : customDomainStatus === 'failed'
                          ? 'bg-rose-500'
                          : 'bg-amber-400'
                    }`}
                  />
                  <span className="ds-small flex-1">
                    {customDomainStatus === 'active'
                      ? 'Domain aktif — SSL sudah terbit.'
                      : customDomainStatus === 'failed'
                        ? 'Pendaftaran domain gagal. Periksa kembali penulisan domain, lalu simpan ulang.'
                        : 'Menunggu verifikasi. Arahkan CNAME domain ini ke proxy-fallback.om-bot.com, lalu tunggu 5-10 menit — status diperbarui otomatis.'}
                  </span>
                  {customDomainStatus === 'active' && (
                    <button
                      type="button"
                      onClick={() => refreshDomainProbe(customDomain.trim())}
                      disabled={probing}
                      className="ds-link inline-flex items-center gap-1"
                    >
                      {probing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Cek akses
                    </button>
                  )}
                </div>
              )}

              {/* Hasil probe: satu baris per host. Apex dan www diperiksa
                  terpisah karena banyak registrar menolak CNAME di root. */}
              {domainProbe && customDomainStatus === 'active' && (
                <div className="ds-well mt-2">
                  {(['apex', 'www'] as const).map((key) => {
                    const r = key === 'apex' ? domainProbe.apex : domainProbe.www;
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                            r.ok ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="ds-mono break-all">{r.host}</span>
                        <span className="ds-small">
                          {r.ok ? 'bisa dibuka' : r.code ? `gagal (HTTP ${r.code})` : 'tidak bisa dihubungi'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status `active` tanpa host yang menjawab = domain tetap mati
                  bagi pembeli. Sebutkan host mana yang harus dipakai. */}
              {domainProbe && customDomainStatus === 'active' && !domainProbe.live && (
                <p className="text-xs text-rose-600 mt-2">
                  Cloudflare sudah menerbitkan sertifikat, tetapi tidak ada host yang menjawab.
                  Penyebab paling sering: record <code>@</code> (apex) belum dibuat di DNS domain kamu.
                  Sementara itu pembeli tetap memakai domain bawaan.
                </p>
              )}
              {domainProbe?.live && customDomainStatus === 'active' && domainProbe.live !== customDomain.trim() && (
                <p className="text-xs text-amber-600 mt-2">
                  Yang bisa dibuka hanya <code>www.{customDomain.trim()}</code>. Apex belum punya record —
                  tambahkan record <code>@</code> di registrar agar <code>{customDomain.trim()}</code> ikut hidup.
                </p>
              )}

              <p className="ds-hint">
                Hubungkan domain sendiri. Tambahkan record berikut di pengaturan DNS domain kamu.
                Kolom nama diisi relatif terhadap domain — tulis <code>@</code> atau <code>www</code>,
                jangan nama lengkap, karena banyak registrar menambahkan domain otomatis.
              </p>
              {customDomainDns.length > 0 && (
                <div className="ds-table-wrap">
                  <table className="w-full text-xs">
                    <thead className="ds-thead">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Tipe</th>
                        <th className="text-left font-medium px-3 py-2">Nama</th>
                        <th className="text-left font-medium px-3 py-2">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customDomainDns.map((r, i) => (
                        <tr key={i} className="align-top">
                          <td className="ds-mono">{r.type}</td>
                          <td className="ds-mono break-all">{r.name}</td>
                          <td className="ds-mono break-all">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-amber-600 mt-1">
                Record <code>@</code> (root domain) ditolak sebagian registrar karena bentrok dengan
                SOA/NS yang selalu ada di sana. Kalau muncul pesan seperti "Conflicts with pre-existing
                RRset", pakai record <code>www</code> saja, atau pindahkan nameserver domain ke
                Cloudflare (gratis) yang bisa memakai CNAME di root.
              </p>
            </Field>

            <Field label="Tagline / Slogan Toko" icon={<Sparkles size={16} className="ds-icon-muted" />}>
              <input
                className="ds-input"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Produk Berkualitas dengan Pelayanan Tercepat"
              />
            </Field>
            </>)}


            {activeTab === 'pembayaran' && (<>
            <Field label="Metode Pembayaran & Notifikasi" icon={<ShieldCheck size={16} className="ds-icon-muted" />}>
              <div className="space-y-4">
                {/* Payment methods list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="ds-section-label">Metode Pembayaran (customer pilih di checkout)</span>
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
                      className="ds-btn-sm"
                    >
                      + Tambah Metode
                    </button>
                  </div>

                  {paymentMethods.length === 0 && (
                    <p className="ds-note">
                      Belum ada metode. Tambahkan minimal satu (Bank Transfer gratis bawaan direkomendasikan).
                    </p>
                  )}

                  {paymentMethods.map((pm, idx) => (
                    <div key={pm.id ?? idx} className="ds-subcard space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="ds-subcard-title">
                          <span className="ds-chip">{pm.type === 'bank_transfer' ? '🏦' : pm.type === 'ewallet' ? '📱' : '💵'}</span>
                          Metode #{idx + 1}
                          <label className="ds-check-label ml-2">
                            <input type="checkbox" checked={pm.enabled} onChange={(e) => {
                              const next = [...paymentMethods];
                              next[idx] = { ...pm, enabled: e.target.checked };
                              setPaymentMethods(next);
                            }} /> Aktif
                          </label>
                          <label className="ds-check-label">
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
                          className="ds-link-danger"
                        >
                          Hapus
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="ds-input ds-input-sm"
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
                          className="ds-input ds-input-sm"
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
                              className="ds-input ds-input-sm"
                              placeholder="Bank / Provider"
                              value={pm.bank_name ?? ''}
                              onChange={(e) => {
                                const next = [...paymentMethods];
                                next[idx] = { ...pm, bank_name: e.target.value };
                                setPaymentMethods(next);
                              }}
                            />
                            <input
                              className="ds-input ds-input-sm"
                              placeholder="Nomor rekening / ID"
                              value={pm.account_number ?? ''}
                              onChange={(e) => {
                                const next = [...paymentMethods];
                                next[idx] = { ...pm, account_number: e.target.value };
                                setPaymentMethods(next);
                              }}
                            />
                            <input
                              className="ds-input ds-input-sm col-span-2"
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
                          className="ds-input ds-input-sm col-span-2"
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

                {/* Midtrans gateway (per toko) */}
                <div className="ds-well">
                  <div className="flex items-center justify-between">
                    <div className="ds-subcard-title">
                      <CreditCard size={14} /> Payment Gateway Midtrans
                    </div>
                    <span className="ds-badge" data-tone={mtServerKey.trim() && mtClientKey.trim() ? 'ok' : undefined}>
                      {mtServerKey.trim() && mtClientKey.trim() ? 'Terhubung' : 'Belum diisi'}
                    </span>
                  </div>
                  <p className="ds-hint">
                    Aktifkan pembayaran otomatis (VA / QRIS / e-Wallet) via Midtrans. Saat key terisi,
                    metode <b>"Midtrans"</b> otomatis muncul di checkout. Ambil key dari dashboard
                    Midtrans Anda (menu Settings → Access Keys).
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div>
                      <label className="ds-label text-[11px]">Server Key</label>
                      <input
                        className="ds-input font-mono"
                        placeholder="SB-Mid-server-xxxx atau Mid-server-xxxx"
                        value={mtServerKey}
                        onChange={(e) => setMtServerKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="ds-label text-[11px]">Client Key</label>
                      <input
                        className="ds-input font-mono"
                        placeholder="SB-Mid-client-xxxx atau Mid-client-xxxx"
                        value={mtClientKey}
                        onChange={(e) => setMtClientKey(e.target.value)}
                      />
                    </div>
                    <label className="ds-check-label mt-1">
                      <input
                        type="checkbox"
                        checked={mtIsProduction}
                        onChange={(e) => setMtIsProduction(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Mode Production
                      <span className="ds-hint text-[10px]">(lepas centang = Sandbox / testing)</span>
                    </label>
                  </div>
                </div>

                {/* Notifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ds-divider-top">
                  <div>
                    <label className="ds-label">Notifikasi WA (nomor owner)</label>
                    <input
                      className="ds-input"
                      placeholder="08xxxxxxxxxx"
                      value={notifyWhatsapp}
                      onChange={(e) => setNotifyWhatsapp(e.target.value)}
                    />
                    <p className="ds-hint text-[10px]">Order baru terkirim ke WhatsApp nomor ini.</p>
                  </div>
                  <div>
                    <label className="ds-label">Notifikasi Telegram (chat ID)</label>
                    <input
                      className="ds-input"
                      placeholder="123456789"
                      value={notifyTelegram}
                      onChange={(e) => setNotifyTelegram(e.target.value)}
                    />
                    <p className="ds-hint text-[10px]">Order baru terkirim ke Telegram chat ini.</p>
                  </div>
                </div>

              </div>
            </Field>
            </>)}

            {activeTab === 'pengiriman' && (<>
            <Field label="Lokasi & Jangkauan Outlet" icon={<MapPin size={16} className="ds-icon-muted" />}>
              <div className="space-y-3">
                <p className="ds-small">
                  Titik outlet dipakai menghitung jarak &amp; ongkir kirim instan. Outlet yang belum
                  dipetakan tidak bisa menolak pesanan di luar jangkauan — jadi ongkir jarak untuknya
                  selalu jatuh ke biaya minimal.
                </p>

                <label className="ds-label">
                  Outlet yang dipetakan
                  <select
                    className="ds-input ds-input-sm mt-1"
                    value={lokasiStoreId}
                    onChange={(e) => pilihOutletUntukLokasi(e.target.value)}
                  >
                    <option value="">— Pilih outlet —</option>
                    {stores.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                        {typeof s.latitude === 'number' && typeof s.longitude === 'number'
                          ? ' (sudah dipetakan)'
                          : ' (belum dipetakan)'}
                      </option>
                    ))}
                  </select>
                </label>

                {lokasiStoreId ? (
                  <>
                    <LocationPicker
                      value={lokasiCoords}
                      onChange={setLokasiCoords}
                      outlets={[]}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <label className="ds-label">
                        Latitude
                        <input
                          className="ds-input ds-input-sm mt-1"
                          type="number"
                          step="0.0000001"
                          value={lokasiCoords?.lat ?? ''}
                          onChange={(e) =>
                            setLokasiCoords((c) => ({
                              lat: e.target.value === '' ? 0 : Number(e.target.value),
                              lng: c?.lng ?? 0,
                            }))
                          }
                        />
                      </label>
                      <label className="ds-label">
                        Longitude
                        <input
                          className="ds-input ds-input-sm mt-1"
                          type="number"
                          step="0.0000001"
                          value={lokasiCoords?.lng ?? ''}
                          onChange={(e) =>
                            setLokasiCoords((c) => ({
                              lat: c?.lat ?? 0,
                              lng: e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>

                    <label className="ds-label">
                      Radius layanan (km)
                      <input
                        className="ds-input ds-input-sm mt-1"
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={lokasiRadius}
                        onChange={(e) => setLokasiRadius(e.target.value)}
                      />
                    </label>
                    <p className="ds-hint">
                      Pembeli di luar radius ini tidak bisa memakai metode kirim instan (jenis
                      &ldquo;Distance&rdquo;). Mereka masih bisa memakai metode lain seperti ekspedisi.
                    </p>

                    {/* Kecamatan asal ekspedisi. RajaOngkir hanya menerima ID
                        kecamatan, jadi titik peta di atas tidak bisa dipakai
                        untuk ekspedisi — dua jalur pengiriman ini butuh
                        penanda wilayah yang berbeda. */}
                    <div className="ds-well">
                      <p className="ds-label">
                        Kecamatan asal ekspedisi
                      </p>
                      {lokasiOrigin ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-emerald-700">{lokasiOrigin.label}</span>
                          <button
                            type="button"
                            className="ds-small underline"
                            onClick={() => {
                              setLokasiOrigin(null);
                              setOriginKata('');
                              setOriginHasil([]);
                            }}
                          >
                            Kosongkan
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            className="ds-input ds-input-sm"
                            placeholder="Cari kecamatan, mis. Kemayoran"
                            value={originKata}
                            onChange={(e) => setOriginKata(e.target.value)}
                          />
                          {originPesan && <p className="ds-hint">{originPesan}</p>}
                          {originHasil.length > 0 && (
                            <ul className="ds-list">
                              {originHasil.map((k) => (
                                <li key={k.id}>
                                  <button
                                    type="button"
                                    className="ds-list-row"
                                    onClick={() => {
                                      setLokasiOrigin({ id: k.id, label: k.label });
                                      setOriginHasil([]);
                                      setOriginPesan(null);
                                    }}
                                  >
                                    {k.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                      <p className="ds-hint">
                        Wajib untuk pengiriman ekspedisi. Kurir memakai kecamatan + berat paket,
                        bukan titik peta.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={simpanLokasiOutlet}
                        disabled={lokasiSaving || (!lokasiCoords && !lokasiOrigin)}
                        className="ds-btn-sm"
                      >
                        {lokasiSaving ? 'Menyimpan…' : 'Simpan lokasi outlet'}
                      </button>
                      {lokasiMsg && (
                        <span
                          className={`text-xs font-medium ${
                            lokasiMsg.kind === 'ok' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {lokasiMsg.msg}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="ds-note">
                    Pilih outlet untuk memetakan lokasinya.
                  </p>
                )}
              </div>
            </Field>

            <Field label="Metode Ongkir" icon={<Truck size={16} className="ds-icon-muted" />}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="ds-section-label">Metode Pengiriman (cost dihitung otomatis saat checkout)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setShippingMethods((prev) => [
                        ...prev,
                        // `id` WAJIB salah satu dari flat/distance/free — itulah
                        // jenis metodenya. Sebelumnya di sini dipakai
                        // `ship_${Date.now()}`, yang tidak dikenali backend:
                        // metodenya diabaikan dan ongkir ditagih Rp 0 tanpa
                        // peringatan, sehingga merchant menanggung biaya kirim.
                        { id: 'flat', name: 'Ongkir Flat', type: 'flat', cost: 15000, per_km: null, min_cost: null, min_order: null, enabled: true },
                      ])
                    }
                    className="ds-btn-sm"
                  >
                    + Tambah Metode
                  </button>
                </div>

                {shippingMethods.length === 0 && (
                  <p className="ds-note">
                    Belum ada metode. Biarkan kosong untuk ongkir gratis pada semua pesanan.
                  </p>
                )}
                {shippingMethods.length > 0 && (
                  <p className="ds-hint">
                    Ongkir terendah yang memenuhi syarat akan dipakai. <span className="font-mono">flat</span> = tarif tetap,{' '}
                    <span className="font-mono">distance</span> = per km (minimal <span className="font-mono">min_cost</span>),{' '}
                    <span className="font-mono">free</span> = gratis bila pesanan di atas <span className="font-mono">min_order</span>,{' '}
                    <span className="font-mono">expedition</span> = tarif dari kurir (JNE, J&amp;T, ...) berbasis berat paket.
                  </p>
                )}

                {shippingMethods.map((sm, idx) => (
                  // key memakai idx, bukan sm.id: id kini berupa JENIS metode
                  // (flat/distance/free), sehingga dua metode berjenis sama akan
                  // menghasilkan key duplikat dan React salah mencocokkan baris.
                  <div key={idx} className="ds-subcard space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="ds-subcard-title">
                        <span className="ds-chip">🚚</span>
                        Metode #{idx + 1}
                        <label className="ds-check-label ml-2">
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
                        className="ds-link-danger"
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="ds-input ds-input-sm"
                        // Pakai jenis hasil resolusi, bukan `sm.id` mentah:
                        // data lama tersimpan sebagai "ship_flat", dan
                        // membandingkannya langsung membuat pilihan ini tampak
                        // kosong padahal metodenya berfungsi.
                        value={shippingMethodKind(sm)}
                        onChange={(e) => {
                          const next = [...shippingMethods];
                          // Set id DAN type sekaligus supaya data tersimpan
                          // dalam bentuk yang dikenali backend.
                          next[idx] = { ...sm, id: e.target.value, type: e.target.value };
                          setShippingMethods(next);
                        }}
                      >
                        {shippingMethodKind(sm) === '' && (
                          // Metode lama yang jenisnya tidak dikenali backend —
                          // beri tahu merchant agar tidak diam-diam jadi Rp 0.
                          <option value="">— Jenis tidak dikenali, pilih ulang —</option>
                        )}
                        <option value="flat">Flat (tarif tetap)</option>
                        <option value="distance">Distance (per km)</option>
                        <option value="free">Free (gratis min order)</option>
                        <option value="expedition">Ekspedisi (tarif kurir)</option>
                      </select>
                      <input
                        className="ds-input ds-input-sm"
                        placeholder="Nama (cth: GoSend Instant)"
                        value={sm.name ?? ''}
                        onChange={(e) => {
                          const next = [...shippingMethods];
                          next[idx] = { ...sm, name: e.target.value };
                          setShippingMethods(next);
                        }}
                      />
                      {shippingMethodKind(sm) === 'flat' && (
                        <input
                          className="ds-input ds-input-sm"
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
                      {shippingMethodKind(sm) === 'distance' && (
                        <>
                          <input
                            className="ds-input ds-input-sm"
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
                            className="ds-input ds-input-sm"
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
                      {shippingMethodKind(sm) === 'free' && (
                        <input
                          className="ds-input ds-input-sm"
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
                    {/* Tarif ekspedisi berasal dari API kurir, bukan angka yang
                        diisi merchant. Yang dipilih di sini hanya kurir mana
                        yang dicoba — tiap kurir menambah satu panggilan API
                        berbayar tiap kali tarif dihitung. */}
                    {shippingMethodKind(sm) === 'expedition' && (
                      <div
                        className="rounded-lg border p-2"
                        style={{ background: 'var(--ds-surface)', borderColor: 'var(--ds-border)' }}
                      >
                        <p className="ds-section-label">Kurir</p>
                        <div className="flex flex-wrap gap-2">
                          {KURIR_EKSPEDISI.map((k) => {
                            const dipilih = (sm.couriers ?? []).includes(k.kode);
                            return (
                              <label key={k.kode} className="ds-check-label">
                                <input
                                  type="checkbox"
                                  checked={dipilih}
                                  onChange={(e) => {
                                    const next = [...shippingMethods];
                                    const lama = sm.couriers ?? [];
                                    const baru = e.target.checked
                                      ? [...lama, k.kode]
                                      : lama.filter((c) => c !== k.kode);
                                    next[idx] = { ...sm, couriers: baru };
                                    setShippingMethods(next);
                                  }}
                                />
                                {k.nama}
                              </label>
                            );
                          })}
                        </div>
                        {(sm.couriers ?? []).length === 0 && (
                          <p className="ds-hint">
                            Belum ada kurir dipilih — pakai daftar bawaan (JNE, J&amp;T, SiCepat).
                          </p>
                        )}
                        <p className="ds-hint">
                          Tarif dihitung otomatis dari kurir saat checkout. Isi dulu berat produk
                          dan kecamatan asal outlet agar tarifnya akurat.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Field>
            </>)}

            {activeTab === 'lanjutan' && (<>
            <Field label="CSS & JavaScript Kustom" icon={<FileCode size={16} className="ds-icon-muted" />}>
              <div className="ds-well">
                <p className="ds-h2 mb-1">Sudah dipindah ke Page Builder.</p>
                <p>
                  CSS &amp; JavaScript global kini dikelola di{' '}
                  <Link href="/owner/web-store/pages" className="ds-link">
                    Pages Manager → Tema Toko (CSS &amp; JavaScript Kustom)
                  </Link>
                  , supaya desain toko diatur di satu tempat bersama halaman.
                </p>
              </div>
            </Field>

            </>)}

            {/* Status Activation — always visible, belongs to toko tab */}
            {activeTab === 'toko' && (
            <div className="ds-divider-top">
              <label className="ds-toggle-row">
                <div>
                  <span className="ds-h2">Status Akses Publik Web Store</span>
                  <span className="ds-hint">
                    {active ? 'Aktif — Toko online dapat diakses langsung oleh pembeli.' : 'Nonaktif — Hanya dapat diakses untuk peninjauan internal.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="ds-switch"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
              </label>
            </div>
            )}

            {/* Status Alert Notification — always visible */}
            {status && (
              <div className="ds-alert" data-tone={status.kind === 'ok' ? 'ok' : 'bad'} role="status">
                {status.kind === 'ok' ? (
                  <CheckCircle2 className="shrink-0" size={16} />
                ) : (
                  <AlertCircle className="shrink-0" size={16} />
                )}
                {status.msg}
              </div>
            )}

            {/* Action Bar */}
            <div
              className="flex items-center justify-between"
              style={{ paddingTop: 14, borderTop: '1px solid var(--ds-border)' }}
            >
              <button onClick={save} disabled={saving} className="ds-btn" data-variant="primary">
                {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                {ws ? 'Simpan Perubahan' : 'Buat Web Store Baru'}
              </button>
            </div>
          </div>
        </div>

        {/* Asisten di halaman ini melayani DATA toko (status web store, domain,
            pembayaran, halaman, stok) — bukan desain. Desain halaman ada di
            builder & editor Puck, yang punya konteks draft sendiri. */}
        <OmBotAiAssistance scope="web-store" pinnedStoreId={ws?.store_id ? Number(ws.store_id) : null} />

      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--ds-fg-muted)',
          marginBottom: 4,
        }}
      >
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
