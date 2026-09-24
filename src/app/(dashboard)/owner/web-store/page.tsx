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
import { normalizeBlock, serializeBlock, type StructuralBlock } from '@/lib/blockSchema';
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
  CreditCard
} from 'lucide-react';
import { WebStoreStatusBadge } from '@/components/web-store/WebStoreStatusBadge';
import { StorefrontPreviewButton } from '@/components/web-store/StorefrontPreviewButton';
import { WebStoreAiAssistant } from '@/components/web-store/WebStoreAiAssistant';
import type { AiChangeSuggestion } from '@/graphql/mutation/aiAssistant';

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

/** Incremental block operations proposed by the AI assistant (#7). */
type BlockOp =
  | { op: 'append_blocks' | 'prepend_blocks' | 'replace_blocks'; blocks: unknown[] }
  | { op: 'update_block'; id: string; props?: Record<string, unknown>; style?: Record<string, unknown> }
  | { op: 'remove_block'; id: string }
  | { op: 'reorder_blocks'; ids: string[] };

/** Convert raw AI blocks into normalized structural blocks with fresh ids. */
function toStructural(raw: unknown[] | undefined, startIndex: number): StructuralBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b, i) => {
    const obj = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
    // LLMs sometimes emit props as a bare array; repair to object form so the
    // normalizer can map values onto the block definition's prop keys.
    if (Array.isArray(obj.props)) {
      const arr = obj.props as unknown[];
      const props: Record<string, unknown> = {};
      if (arr.length > 0 && arr.every((it) => it && typeof it === 'object' && !Array.isArray(it))) {
        // Heuristic: repeater-style content → expose the list under common keys.
        const keys = ['items', 'faqs', 'slides', 'images', 'links', 'variants'];
        const list = arr;
        for (const k of keys) props[k] = list;
      } else {
        for (const it of arr) {
          if (it && typeof it === 'object' && !Array.isArray(it)) Object.assign(props, it);
        }
      }
      obj.props = props;
    }
    return normalizeBlock(obj, startIndex + i);
  });
}

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

  function applyAiChanges(changes: AiChangeSuggestion[]) {
    let applied = 0;
    let skipped = 0;

    for (const change of changes) {
      if ((change.field === 'theme' || change.field === 'web_store.theme') && change.to && typeof change.to === 'object') {
        setTheme((prev) => normalizeTheme({ ...prev, ...(change.to as Record<string, unknown>) }));
        applied++;
      } else if ((change.field === 'chrome' || change.field === 'web_store.chrome') && change.to && typeof change.to === 'object') {
        setChrome((prev) => normalizeChrome({ ...prev, ...(change.to as Record<string, unknown>) }));
        applied++;
      } else if ((change.field === 'theme_color' || change.field === 'web_store.theme_color') && typeof change.to === 'string') {
        setThemeColor(change.to);
        applied++;
      } else if ((change.field === 'pages' || change.field === 'web_store.pages') && Array.isArray(change.to)) {
        setDraftPages(change.to as WebPage[]);
        setPagesDirty(true);
        applied++;
      } else if ((change.field === 'current_page' || change.field === 'page') && change.to && typeof change.to === 'object') {
        const value = change.to as { slug?: string; blocks?: WebPage['blocks']; title?: string; is_published?: boolean };
        if (value.slug) {
          setDraftPages((prev) => prev.map((p) => p.slug === value.slug ? { ...p, ...value } : p));
          setPagesDirty(true);
          applied++;
        }
      } else if (change.field.startsWith('page:') && change.to && typeof change.to === 'object') {
        const value = change.to as { slug?: string; blocks?: WebPage['blocks']; title?: string; is_published?: boolean };
        const slug = change.field.slice(5);
        setDraftPages((prev) => prev.map((p) => p.slug === slug ? { ...p, ...value, slug: value.slug ?? p.slug } : p));
        setPagesDirty(true);
        applied++;
      } else if (change.field.startsWith('block_ops') && change.to && typeof change.to === 'object') {
        const payload = change.to as { slug?: string; ops?: BlockOp[] };
        const slug = payload.slug ?? change.field.slice('block_ops:'.length);
        if (!slug || !Array.isArray(payload.ops)) {
          skipped++;
          continue;
        }
        const result = applyBlockOps(slug, payload.ops);
        if (result === 0) skipped++;
        else applied++;
      } else {
        skipped++;
      }
    }

    if (applied > 0) {
      setStatus({ kind: 'ok', msg: `Usulan AI diterapkan ke draft (${applied} perubahan${skipped > 0 ? `, ${skipped} dilewati` : ''}). Klik Simpan Perubahan untuk menyimpan.` });
    } else {
      setStatus({ kind: 'err', msg: 'Tidak ada usulan AI yang bisa diterapkan — halaman target tidak ditemukan atau ops kosong.' });
    }
  }

  /**
   * Apply incremental block operations (#7) to a page draft.
   * Returns the number of ops applied; 0 when the page was not found.
   */
  function applyBlockOps(slug: string, ops: BlockOp[]): number {
    const idx = draftPages.findIndex((p) => p.slug === slug);
    if (idx === -1) return 0;
    const page = draftPages[idx];
    // Round-trip through the schema normalizer so legacy/flat blocks,
    // missing ids and unknown types behave the same as manual editing.
    const structural: StructuralBlock[] = (page.blocks ?? []).map((b, i) => normalizeBlock(b, i));

    let used = 0;
    for (const op of ops) {
      if (!op || typeof op !== 'object') continue;
      switch (op.op) {
        case 'append_blocks': {
          const blocks = toStructural(op.blocks, structural.length);
          structural.push(...blocks);
          used++;
          break;
        }
        case 'prepend_blocks': {
          const blocks = toStructural(op.blocks, structural.length);
          structural.unshift(...blocks);
          used++;
          break;
        }
        case 'replace_blocks': {
          const blocks = toStructural(op.blocks, 0);
          structural.length = 0;
          structural.push(...blocks);
          used++;
          break;
        }
        case 'update_block': {
          const target = op.id ? structural.find((b) => b.id === op.id) : undefined;
          if (!target) continue;
          if (op.props && typeof op.props === 'object') {
            // Merge: only provided props change; unknown keys of the target are preserved.
            target.props = { ...target.props, ...(op.props as Record<string, unknown>) };
          }
          if (op.style && typeof op.style === 'object') {
            target.style = { ...target.style, ...(op.style as Record<string, unknown>) };
          }
          used++;
          break;
        }
        case 'remove_block': {
          const pos = structural.findIndex((b) => b.id === op.id);
          if (pos === -1) continue;
          structural.splice(pos, 1);
          used++;
          break;
        }
        case 'reorder_blocks': {
          if (!Array.isArray(op.ids) || op.ids.length === 0) continue;
          const map = new Map(structural.map((b) => [b.id, b]));
          const reordered: StructuralBlock[] = [];
          for (const id of op.ids) {
            const b = map.get(String(id));
            if (b) {
              reordered.push(b);
              map.delete(String(id));
            }
          }
          // Blocks not mentioned keep their relative order at the end.
          reordered.push(...map.values());
          structural.length = 0;
          structural.push(...reordered);
          used++;
          break;
        }
      }
    }

    if (used > 0) {
      const next = [...draftPages];
      next[idx] = { ...page, blocks: structural.map(serializeBlock) as WebPage['blocks'] };
      setDraftPages(next);
      setPagesDirty(true);
    }
    return used;
  }

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
          <ArrowLeft size={8} />
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
            <ArrowLeft size={8} />
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
            <Link
              href="/owner/web-store/pages"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/20 transition-colors"
            >
              <LayoutTemplate size={15} /> Page Builder
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Settings */}
        <div className="lg:col-span-12 space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
            {([
              { key: 'toko' as const, label: 'Toko', icon: Store },
              { key: 'pembayaran' as const, label: 'Pembayaran', icon: ShieldCheck },
              { key: 'pengiriman' as const, label: 'Pengiriman', icon: Truck },
              { key: 'lanjutan' as const, label: 'Lanjutan', icon: Settings },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              {activeTab === 'toko' && <><Store size={20} className="text-blue-600" /> Informasi Toko</>}
              {activeTab === 'pembayaran' && <><ShieldCheck size={20} className="text-blue-600" /> Metode Pembayaran</>}
              {activeTab === 'pengiriman' && <><Truck size={20} className="text-blue-600" /> Metode Pengiriman</>}
              {activeTab === 'lanjutan' && <><Settings size={20} className="text-blue-600" /> Pengaturan Lanjutan</>}
            </h2>

            {activeTab === 'toko' && (<>
            {/* Relasi outlet awal hanya muncul saat membuat webstore baru. Produk dan stok storefront tetap berasal dari seluruh outlet owner. */}
            {!ws && (
              <Field label="Outlet Awal Web Store" icon={<Store size={16} className="text-slate-400" />}>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  <option value="">— Pilih outlet awal —</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1.5 leading-normal">
                  Hanya diperlukan saat membuat Web Store baru. Produk dan stok tetap berasal dari seluruh outlet milik owner.
                </p>
              </Field>
            )}

            <Field label="Nama Web Store" icon={<Globe size={16} className="text-slate-400" />}>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Toko Budi Official Store"
              />
            </Field>

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

            <Field label="Tagline / Slogan Toko" icon={<Sparkles size={16} className="text-slate-400" />}>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Produk Berkualitas dengan Pelayanan Tercepat"
              />
            </Field>
            </>)}


            {activeTab === 'pembayaran' && (<>
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

                {/* Midtrans gateway (per toko) */}
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                      <CreditCard size={14} /> Payment Gateway Midtrans
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${mtServerKey.trim() && mtClientKey.trim() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {mtServerKey.trim() && mtClientKey.trim() ? 'Terhubung' : 'Belum diisi'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-600/70">
                    Aktifkan pembayaran otomatis (VA / QRIS / e-Wallet) via Midtrans. Saat key terisi,
                    metode <b>"Midtrans"</b> otomatis muncul di checkout. Ambil key dari dashboard
                    Midtrans Anda (menu Settings → Access Keys).
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Server Key</label>
                      <input
                        className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm font-mono"
                        placeholder="SB-Mid-server-xxxx atau Mid-server-xxxx"
                        value={mtServerKey}
                        onChange={(e) => setMtServerKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Client Key</label>
                      <input
                        className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm font-mono"
                        placeholder="SB-Mid-client-xxxx atau Mid-client-xxxx"
                        value={mtClientKey}
                        onChange={(e) => setMtClientKey(e.target.value)}
                      />
                    </div>
                    <label className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={mtIsProduction}
                        onChange={(e) => setMtIsProduction(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Mode Production
                      <span className="text-[10px] text-slate-400">(lepas centang = Sandbox / testing)</span>
                    </label>
                  </div>
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

              </div>
            </Field>
            </>)}

            {activeTab === 'pengiriman' && (<>
            <Field label="Lokasi & Jangkauan Outlet" icon={<MapPin size={16} className="text-slate-400" />}>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Titik outlet dipakai menghitung jarak &amp; ongkir kirim instan. Outlet yang belum
                  dipetakan tidak bisa menolak pesanan di luar jangkauan — jadi ongkir jarak untuknya
                  selalu jatuh ke biaya minimal.
                </p>

                <label className="block text-xs font-semibold text-slate-500">
                  Outlet yang dipetakan
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs font-normal"
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
                      <label className="block text-xs font-semibold text-slate-500">
                        Latitude
                        <input
                          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs font-normal"
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
                      <label className="block text-xs font-semibold text-slate-500">
                        Longitude
                        <input
                          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs font-normal"
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

                    <label className="block text-xs font-semibold text-slate-500">
                      Radius layanan (km)
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs font-normal"
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={lokasiRadius}
                        onChange={(e) => setLokasiRadius(e.target.value)}
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Pembeli di luar radius ini tidak bisa memakai metode kirim instan (jenis
                      &ldquo;Distance&rdquo;). Mereka masih bisa memakai metode lain seperti ekspedisi.
                    </p>

                    {/* Kecamatan asal ekspedisi. RajaOngkir hanya menerima ID
                        kecamatan, jadi titik peta di atas tidak bisa dipakai
                        untuk ekspedisi — dua jalur pengiriman ini butuh
                        penanda wilayah yang berbeda. */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">
                        Kecamatan asal ekspedisi
                      </p>
                      {lokasiOrigin ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-emerald-700">{lokasiOrigin.label}</span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-500 underline"
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
                            className="w-full rounded-lg border px-2 py-1.5 text-xs"
                            placeholder="Cari kecamatan, mis. Kemayoran"
                            value={originKata}
                            onChange={(e) => setOriginKata(e.target.value)}
                          />
                          {originPesan && <p className="mt-1 text-xs text-slate-500">{originPesan}</p>}
                          {originHasil.length > 0 && (
                            <ul className="mt-1 max-h-40 divide-y divide-slate-100 overflow-auto rounded-lg border bg-white">
                              {originHasil.map((k) => (
                                <li key={k.id}>
                                  <button
                                    type="button"
                                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50"
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
                      <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
                        Wajib untuk pengiriman ekspedisi. Kurir memakai kecamatan + berat paket,
                        bukan titik peta.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={simpanLokasiOutlet}
                        disabled={lokasiSaving || (!lokasiCoords && !lokasiOrigin)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
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
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-slate-400">
                    Pilih outlet untuk memetakan lokasinya.
                  </p>
                )}
              </div>
            </Field>

            <Field label="Metode Ongkir" icon={<Truck size={16} className="text-slate-400" />}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Metode Pengiriman (cost dihitung otomatis saat checkout)</span>
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
                    <span className="font-mono">free</span> = gratis bila pesanan di atas <span className="font-mono">min_order</span>,{' '}
                    <span className="font-mono">expedition</span> = tarif dari kurir (JNE, J&amp;T, ...) berbasis berat paket.
                  </p>
                )}

                {shippingMethods.map((sm, idx) => (
                  // key memakai idx, bukan sm.id: id kini berupa JENIS metode
                  // (flat/distance/free), sehingga dua metode berjenis sama akan
                  // menghasilkan key duplikat dan React salah mencocokkan baris.
                  <div key={idx} className="rounded-xl border bg-slate-50/70 p-3 space-y-2">
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
                        className="rounded-lg border px-2 py-1.5 text-xs"
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
                      {shippingMethodKind(sm) === 'distance' && (
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
                      {shippingMethodKind(sm) === 'free' && (
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
                    {/* Tarif ekspedisi berasal dari API kurir, bukan angka yang
                        diisi merchant. Yang dipilih di sini hanya kurir mana
                        yang dicoba — tiap kurir menambah satu panggilan API
                        berbayar tiap kali tarif dihitung. */}
                    {shippingMethodKind(sm) === 'expedition' && (
                      <div className="rounded-lg border bg-white p-2">
                        <p className="mb-1.5 text-[10px] font-semibold text-slate-500 uppercase">Kurir</p>
                        <div className="flex flex-wrap gap-2">
                          {KURIR_EKSPEDISI.map((k) => {
                            const dipilih = (sm.couriers ?? []).includes(k.kode);
                            return (
                              <label key={k.kode} className="flex items-center gap-1 text-xs text-slate-600">
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
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            Belum ada kurir dipilih — pakai daftar bawaan (JNE, J&amp;T, SiCepat).
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
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
            <Field label="CSS & JavaScript Kustom" icon={<FileCode size={16} className="text-slate-400" />}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Sudah dipindah ke Page Builder.</p>
                <p>
                  CSS &amp; JavaScript global kini dikelola di{' '}
                  <Link href="/owner/web-store/pages" className="text-blue-600 font-semibold hover:underline">
                    Pages Manager → Tema Toko (CSS &amp; JavaScript Kustom)
                  </Link>
                  , supaya desain toko diatur di satu tempat bersama halaman.
                </p>
              </div>
            </Field>

            <Field label="Domain Kustom" icon={<Globe size={16} className="text-slate-400" />}>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="toko-anda.com (opsional)"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Hubungkan domain sendiri. Arahkan CNAME ke <code className="text-slate-500">cname.om-bot.com</code>.
              </p>
            </Field>
            </>)}

            {/* Status Activation — always visible, belongs to toko tab */}
            {activeTab === 'toko' && (
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
            )}

            {/* Status Alert Notification — always visible */}
            {status && (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all animate-in fade-in ${status.kind === 'ok'
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

            </div>
          </div>
        </div>

        <WebStoreAiAssistant
          webStoreId={ws?.id ?? null}
          scope="setup"
          context={{ store: { name: storeName, tagline, themeColor }, theme, chrome, pages: ws?.pages ?? [] }}
          onApply={applyAiChanges}
        />

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
