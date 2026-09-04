'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { upsertWebPage } from '@/graphql/mutation/webstore';
import type { WebPage } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { normalizeTheme, themeToCss } from '@/lib/webTheme';
import PuckPageEditor from '@/components/web-store/PuckPageEditor';

/**
 * Editor halaman web store — berbasis Puck (plugin visual editor).
 *
 * Arsitektur (disepakati):
 * - omBot tidak menimpa Puck: hanya definisikan config komponen + simpan JSON.
 * - Data disimpan ganda di web_pages.blocks: { puck, legacy }.
 * - Semua store memakai editor yang sama; tiap web_store punya pages sendiri.
 * - Blok lama otomatis dikonversi ke Puck saat pertama dibuka (badge "blok lama").
 */

export default function PuckEditorRoute() {
  const params = useParams<{ pageId: string }>();
  const pageId = params?.pageId ?? '';

  const [token, setToken] = useState('');
  const [page, setPage] = useState<WebPage | null>(null);
  const [themeCss, setThemeCss] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (tok: string) => {
    if (!tok) {
      setError('Tidak ada token. Login dulu.');
      setLoading(false);
      return;
    }
    try {
      const payload = decodeJwt(tok);
      const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
      const res = await getWebStoreByOwner(ownerId, tok);
      const ws = res.webStoreByOwner;
      if (!ws) throw new Error('Web store belum dibuat. Buat dulu di Setup.');
      const pg = ws.pages?.find((p) => String(p.id) === String(pageId));
      if (!pg) throw new Error('Halaman tidak ditemukan.');
      setPage(pg);
      // Tema global toko → CSS vars utk kanvas editor & preview.
      const t = normalizeTheme(((ws.settings as any)?.theme ?? null) as Record<string, unknown> | null);
      setThemeCss(themeToCss(t));
    } catch (e: any) {
      setError(e?.message ?? 'Gagal memuat halaman');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    load(t);
  }, [load]);

  const handleSave = useCallback(
    async (blocks: unknown) => {
      if (!token || !page) throw new Error('Belum siap menyimpan');
      await upsertWebPage(token, {
        id: page.id,
        slug: page.slug,
        title: page.title,
        blocks,
        is_published: page.is_published,
        full_page: page.full_page,
      });
    },
    [token, page]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <Link href="/owner/web-store/pages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} /> Kembali ke Pages
        </Link>
        <Loader2 className="animate-spin text-blue-600" size={30} />
        <span className="text-sm font-medium">Memuat editor...</span>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          <AlertCircle size={16} /> {error ?? 'Halaman tidak ditemukan'}
        </div>
        <Link href="/owner/web-store/pages" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← Kembali ke Pages
        </Link>
      </div>
    );
  }

  return <PuckPageEditor token={token} pageId={page.id} initial={page} onSave={handleSave} themeCss={themeCss} />;
}
