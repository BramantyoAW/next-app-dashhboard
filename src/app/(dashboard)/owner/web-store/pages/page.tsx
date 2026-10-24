'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { deleteWebPage, upsertWebPage } from '@/graphql/mutation/webstore';
import type { WebPage } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { Plus, Trash2, Loader2, FileText, ArrowLeft, ExternalLink, AlertCircle, LayoutTemplate } from 'lucide-react';
import WebThemePanel from '@/components/web-store/WebThemePanel';

const SLUG_LABEL: Record<string, string> = {
  home: 'Beranda',
  thankyou: 'Terima Kasih (Thank You)',
  about: 'Tentang',
  contact: 'Kontak',
  faq: 'FAQ',
  product: 'Halaman Produk (PDP)',
  cart: 'Keranjang',
  checkout: 'Checkout',
  category: 'Kategori Produk',
};

/** Slug halaman bawaan — tidak bisa dihapus (cocok dgn WebPage::SYSTEM_SLUGS BE). */
const SYSTEM_SLUGS = ['home', 'thankyou', 'about', 'contact', 'faq', 'product', 'cart', 'checkout', 'category'];

export default function WebPagesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [pages, setPages] = useState<WebPage[]>([]);
  const [storeId, setStoreId] = useState('');
  const [storeTheme, setStoreTheme] = useState<Record<string, any> | null>(null);
  const [storeChrome, setStoreChrome] = useState<Record<string, any> | null>(null);
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('home');
  const [customSlug, setCustomSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Auto-create dari editor: /owner/web-store/pages?new=<slug>
  const newFromQuery = searchParams.get('new');
  const didAuto = useRef(false);
  useEffect(() => {
    if (!newFromQuery || didAuto.current || !token || loading) return;
    didAuto.current = true;
    const existing = pages.find((p) => p.slug === newFromQuery);
    if (existing) {
      router.replace(`/owner/web-store/pages/${existing.id}`);
    } else {
      setSlug(newFromQuery);
      // Tunggu state slug ter-set lalu panggil createPage.
      setTimeout(() => createPageRef.current?.(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFromQuery, token, loading, pages]);

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
      setStoreId(ws.store_id);
      setStoreName(ws.store_name);
      setStoreTheme(((ws.settings as any)?.theme ?? null) as Record<string, any> | null);
      setStoreChrome(((ws.settings as any)?.chrome ?? null) as Record<string, any> | null);
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

  // Ref terbaru createPage utk auto-create via query ?new=.
  const createPageRef = useRef(createPage);
  createPageRef.current = createPage;

  /** Buat halaman statis baru (SLUG BEBAS). Bila slug sudah ada → buka editor existing. */
  async function createCustomPage() {
    if (!token) return;
    const s = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s) {
      setError('Ketik dulu slug halaman baru, mis. promo, kebijakan, katalog.');
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const existing = pages.find((p) => p.slug === s);
      if (existing) {
        setOk(`Halaman "${existing.slug}" sudah ada. Membuka editor...`);
        router.push(`/owner/web-store/pages/${existing.id}`);
        return;
      }
      const res = await upsertWebPage(token, {
        slug: s,
        // Pakai huruf pertama sebagai judul — nanti bisa diganti di editor.
        title: SLUG_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '),
        blocks: [],
        is_published: true,
      });
      setOk('Halaman baru dibuat. Buka editor untuk menata blok.');
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
      <div className="ds-page-head">
        <div>
          <Link href="/owner/web-store" className="ds-link inline-flex items-center gap-1.5 mb-3">
            <ArrowLeft size={16} /> Kembali ke Setup
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <LayoutTemplate size={15} className="ds-icon-muted" />
            <span className="ds-caption uppercase tracking-wide">Halaman Dinamis</span>
          </div>
          <h1 className="ds-display">Pages Manager</h1>
          <p className="ds-small mt-1 max-w-xl">
            Kelola halaman toko (Beranda, Tentang, Kontak, FAQ) dan susun bloknya seperti Shopify.
          </p>
        </div>
      </div>

      {error && (
        <div className="ds-alert" data-tone="bad">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {ok && (
        <div className="ds-alert" data-tone="ok">
          ✓ {ok}
        </div>
      )}

      {/* Tema global toko — sinkron dgn page builder & storefront */}
      {token && storeId && (
        <WebThemePanel token={token} storeId={storeId} storeName={storeName} initialTheme={storeTheme} initialChrome={storeChrome} />
      )}

      {/* Create new — SELALU buat halaman baru (slug bebas) */}
      <div className="ds-card p-6">
        <h2 className="ds-h1 mb-4 flex items-center gap-2">
          <Plus size={18} className="ds-accent-text" /> Buat Halaman Baru
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 max-w-2xl">
            <input
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createCustomPage(); }}
              placeholder="ketik slug baru — mis. promo, kebijakan, katalog"
              className="ds-input flex-1 min-w-0"
            />
            <button
              onClick={createCustomPage}
              disabled={saving || !token}
              className="ds-btn shrink-0"
              data-variant="primary"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Buat Halaman Baru
            </button>
          </div>
          <p className="ds-caption max-w-2xl">
            Halaman statis baru yang benar-benar baru. Diisi sendiri dengan blok di Page Builder,
            dan otomatis tampil di <span className="ds-mono">/storefront/&lt;hash&gt;/{customSlug || 'slug'}</span>.
          </p>
        </div>
      </div>

      {/* Pages list */}
      <div className="ds-card p-6">
        <h2 className="ds-h1 mb-4 flex items-center gap-2">
          <FileText size={18} className="ds-accent-text" /> Daftar Halaman ({pages.length})
        </h2>
        {loading ? (
          <div className="ds-small flex items-center justify-center py-10">
            <Loader2 className="animate-spin ds-accent-text mr-2" size={20} /> Memuat...
          </div>
        ) : pages.length === 0 ? (
          <div className="ds-empty">
            Belum ada halaman. Buat satu di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((p) => (
              <div key={p.id} className="ds-subcard flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="ds-body font-semibold">{p.title}</span>
                    <span className="ds-badge uppercase tracking-wide">
                      {p.slug}
                    </span>
                    {SYSTEM_SLUGS.includes(p.slug) ? (
                      <span className="ds-badge uppercase tracking-wide" data-tone="ok">
                        Bawaan
                      </span>
                    ) : (
                      <span className="ds-badge uppercase tracking-wide">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="ds-caption mt-0.5">
                    {p.blocks?.length ? `${p.blocks.length} blok` : 'Belum ada blok'} ·{' '}
                    {p.is_published ? 'Tayang' : 'Draft'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/owner/web-store/pages/${p.id}`}
                    className="ds-btn"
                    data-variant="primary"
                  >
                    <ExternalLink size={14} /> Edit Blok
                  </Link>
                  {!SYSTEM_SLUGS.includes(p.slug) && (
                    <button
                      onClick={() => removePage(p.id)}
                      disabled={deleting === p.id}
                      className="ds-btn"
                      data-variant="danger"
                      data-size="sm"
                      aria-label="Hapus"
                      title="Halaman custom dapat dihapus"
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
