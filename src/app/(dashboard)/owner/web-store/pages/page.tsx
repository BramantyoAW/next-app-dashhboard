'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { deleteWebPage, upsertWebPage } from '@/graphql/mutation/webstore';
import type { WebPage } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { Plus, Trash2, Loader2, FileText, ArrowLeft, ExternalLink, AlertCircle, LayoutTemplate } from 'lucide-react';
import WebThemePanel from '@/components/web-store/WebThemePanel';

const SLUG_LABEL: Record<string, string> = {
  home: 'Beranda',
  about: 'Tentang',
  contact: 'Kontak',
  faq: 'FAQ',
  product: 'Halaman Produk (PDP)',
  cart: 'Keranjang',
  checkout: 'Checkout',
  category: 'Kategori Produk',
};

const SLUG_HINT: Record<string, string> = {
  home: 'Landing utama — sudah aktif.',
  about: 'Halaman statis profil toko.',
  contact: 'Halaman statis kontak.',
  faq: 'Halaman statis pertanyaan umum.',
  product: 'Template detail produk. Bagian produk (gambar, harga, beli) otomatis dari katalog; taruh blok “Slot Produk (PDP)” di posisi produk.',
  cart: 'Halaman keranjang.',
  checkout: 'Halaman checkout & ringkasan pesanan.',
  category: 'Template halaman daftar produk per kategori.',
};

const SLUG_OPTIONS: { value: string; label: string; hint: string }[] = Object.keys(SLUG_LABEL).map((k) => ({
  value: k,
  label: SLUG_LABEL[k],
  hint: SLUG_HINT[k] ?? '',
}));

export default function WebPagesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [pages, setPages] = useState<WebPage[]>([]);
  const [webStoreId, setWebStoreId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [storeTheme, setStoreTheme] = useState<Record<string, any> | null>(null);
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async (tok: string) => {
    if (!tok) return;
    try {
      const payload = decodeJwt(tok);
      const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
      const res = await getWebStoreByOwner(ownerId, tok);
      const ws = res.webStoreByOwner;
      if (!ws) {
        setError('Web store belum dibuat. Buat dulu di Setup.');
        return;
      }
      setWebStoreId(ws.id);
      setStoreId(ws.store_id);
      setStoreName(ws.store_name);
      setStoreTheme(((ws.settings as any)?.theme ?? null) as Record<string, any> | null);
      setPages(ws.pages ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal memuat halaman');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    load(t);
  }, [load]);

  async function createPage() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const existing = pages.find((p) => p.slug === slug);
      if (existing) {
        // Halaman sudah ada → jangan timpa blok, langsung buka editor.
        setOk('Halaman sudah ada. Membuka editor...');
        router.push(`/owner/web-store/pages/${existing.id}`);
        return;
      }
      const res = await upsertWebPage(token, {
        slug,
        title: SLUG_LABEL[slug] ?? slug,
        blocks: [],
        is_published: true,
      });
      setOk('Halaman dibuat. Buka editor untuk menata blok.');
      router.push(`/owner/web-store/pages/${res.upsertWebPage.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal membuat halaman');
    } finally {
      setSaving(false);
    }
  }

  async function removePage(id: string) {
    if (!token || !confirm('Hapus halaman ini?')) return;
    setDeleting(id);
    setError(null);
    try {
      await deleteWebPage(token, { id });
      setPages((p) => p.filter((x) => x.id !== id));
      setOk('Halaman dihapus.');
    } catch (e: any) {
      setError(e?.message ?? 'Gagal menghapus halaman');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/owner/web-store" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} /> Kembali ke Setup
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30 backdrop-blur-sm">
            <LayoutTemplate size={14} /> Halaman Dinamis
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Pages Manager</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Kelola halaman toko (Beranda, Tentang, Kontak, FAQ) dan susun bloknya seperti Shopify.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          ✓ {ok}
        </div>
      )}

      {/* Tema global toko — sinkron dgn page builder & storefront */}
      {token && webStoreId && storeId && (
        <WebThemePanel token={token} webStoreId={webStoreId} storeId={storeId} storeName={storeName} initialTheme={storeTheme} />
      )}

      {/* Create new */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-blue-600" /> Buat Halaman Baru
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="w-full sm:w-auto">
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SLUG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.value})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400 max-w-md">
              {SLUG_HINT[slug]}
            </p>
          </div>
          <button
            onClick={createPage}
            disabled={saving || !token}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Buat / Buka Editor
          </button>
        </div>
      </div>

      {/* Pages list */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" /> Daftar Halaman ({pages.length})
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="animate-spin text-blue-600 mr-2" size={20} /> Memuat...
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Belum ada halaman. Buat satu di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{p.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                      {p.slug}
                    </span>
                    {p.slug === 'home' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                        Landing
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {p.blocks?.length ? `${p.blocks.length} blok` : 'Belum ada blok'} ·{' '}
                    {p.is_published ? 'Tayang' : 'Draft'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/owner/web-store/pages/${p.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={14} /> Edit Blok
                  </Link>
                  {p.slug !== 'home' && (
                    <button
                      onClick={() => removePage(p.id)}
                      disabled={deleting === p.id}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      aria-label="Hapus"
                    >
                      {deleting === p.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
