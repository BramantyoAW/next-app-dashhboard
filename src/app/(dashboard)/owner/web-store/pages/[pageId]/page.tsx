'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { upsertWebPage } from '@/graphql/mutation/webstore';
import type { WebPage, PageBlock } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Eye,
  Image as ImageIcon,
  Type,
  ShoppingBag,
  HelpCircle,
  MousePointerClick,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

// ---------- Block definitions ----------
type BlockDef = {
  type: string;
  label: string;
  icon: any;
  defaults: Record<string, unknown>;
  fields: { key: string; label: string; kind: 'text' | 'textarea' | 'color' | 'number' }[];
};

const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'hero',
    label: 'Hero / Banner Utama',
    icon: ImageIcon,
    defaults: {
      heading: 'Judul Hero',
      subheading: 'Sub judul / tagline',
      cta_text: 'Belanja Sekarang',
      cta_link: '#products',
      image_url: '',
      bg_color: '#1e293b',
      text_color: '#ffffff',
    },
    fields: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'subheading', label: 'Subjudul', kind: 'textarea' },
      { key: 'cta_text', label: 'Teks Tombol', kind: 'text' },
      { key: 'cta_link', label: 'Link Tombol (mis. #products)', kind: 'text' },
      { key: 'image_url', label: 'URL Gambar (opsional)', kind: 'text' },
      { key: 'bg_color', label: 'Warna Latar', kind: 'color' },
      { key: 'text_color', label: 'Warna Teks', kind: 'color' },
    ],
  },
  {
    type: 'text',
    label: 'Teks',
    icon: Type,
    defaults: { heading: 'Judul Bagian', body: 'Tulis paragraf di sini...' },
    fields: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'body', label: 'Isi', kind: 'textarea' },
    ],
  },
  {
    type: 'products',
    label: 'Produk Unggulan',
    icon: ShoppingBag,
    defaults: { heading: 'Produk Kami', limit: 8 },
    fields: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'limit', label: 'Jumlah Produk', kind: 'number' },
    ],
  },
  {
    type: 'cta',
    label: 'Ajakan (CTA)',
    icon: MousePointerClick,
    defaults: { heading: 'Siap Belanja?', body: 'Lihat katalog produk kami.', button_text: 'Lihat Produk', button_link: '#products' },
    fields: [
      { key: 'heading', label: 'Judul', kind: 'text' },
      { key: 'body', label: 'Isi', kind: 'textarea' },
      { key: 'button_text', label: 'Teks Tombol', kind: 'text' },
      { key: 'button_link', label: 'Link Tombol', kind: 'text' },
    ],
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: HelpCircle,
    defaults: { heading: 'Pertanyaan Umum', items: [{ q: 'Pertanyaan?', a: 'Jawaban.' }] },
    fields: [
      { key: 'heading', label: 'Judul', kind: 'text' },
    ],
  },
];

const DEF_MAP = Object.fromEntries(BLOCK_DEFS.map((d) => [d.type, d]));

function normalizeBlocks(raw: unknown[] | null | undefined): PageBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b, idx) => {
    const block = (b ?? {}) as Record<string, unknown>;
    const def = DEF_MAP[String(block.type ?? '')];
    const merged = { ...(def?.defaults ?? {}), ...block };
    return { id: String(block.id ?? `blk_${idx}`), type: String(block.type ?? 'text'), ...merged } as PageBlock;
  });
}

// ---------- Storefront preview (mini renderer) ----------
function BlockPreview({ block, webStore }: { block: PageBlock; webStore: any }) {
  const b = block as any;
  switch (block.type) {
    case 'hero':
      return (
        <div style={{ background: b.bg_color || '#1e293b', color: b.text_color || '#fff' }} className="rounded-xl p-6 text-center">
          <h3 className="text-xl font-extrabold">{b.heading}</h3>
          {b.subheading && <p className="text-sm mt-1 opacity-80">{b.subheading}</p>}
          {b.cta_text && (
            <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-bold">
              {b.cta_text}
            </span>
          )}
        </div>
      );
    case 'text':
      return (
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900">{b.heading}</h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-3">{b.body}</p>
        </div>
      );
    case 'products':
      return (
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900">{b.heading}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: Math.min(Number(b.limit) || 2, 4) }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2 text-center">
                <div className="h-14 rounded-md bg-slate-100" />
                <div className="h-2.5 w-3/4 mx-auto mt-2 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 mx-auto mt-1 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div className="p-6 text-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <h3 className="text-lg font-bold">{b.heading}</h3>
          <p className="text-sm mt-1 opacity-90">{b.body}</p>
          <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-white text-indigo-700 text-xs font-bold">{b.button_text}</span>
        </div>
      );
    case 'faq':
      return (
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900">{b.heading}</h3>
          <div className="mt-2 space-y-1.5">
            {(b.items ?? []).map((it: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs">
                <div className="font-bold text-slate-800">{it.q}</div>
                <div className="text-slate-500 mt-0.5 line-clamp-2">{it.a}</div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <div className="p-3 text-xs text-slate-400">Blok {block.type}</div>;
  }
}

// ---------- Editor ----------
export default function PageEditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params?.pageId ?? '';

  const [token, setToken] = useState('');
  const [page, setPage] = useState<WebPage | null>(null);
  const [webStore, setWebStore] = useState<any>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (!t) return;
    (async () => {
      try {
        const payload = decodeJwt(t);
        const ownerId = String(payload?.sub ?? payload?.id ?? payload?.user_id ?? '');
        const res = await getWebStoreByOwner(ownerId, t);
        const ws = res.webStoreByOwner;
        if (!ws) throw new Error('Web store belum dibuat');
        setWebStore(ws);
        const pg = ws.pages?.find((p) => String(p.id) === String(pageId));
        if (!pg) throw new Error('Halaman tidak ditemukan');
        setPage(pg);
        setBlocks(normalizeBlocks(pg.blocks));
      } catch (e: any) {
        setError(e?.message ?? 'Gagal memuat halaman');
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  const defFor = (b: PageBlock) => DEF_MAP[b.type] ?? DEF_MAP.text;

  function addBlock(type: string) {
    const def = DEF_MAP[type];
    const id = `blk_${Date.now()}`;
    setBlocks((prev) => [...prev, { id, type, ...JSON.parse(JSON.stringify(def?.defaults ?? {})) } as PageBlock]);
    setPreview(false);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function updateBlock(id: string, key: string, value: unknown) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [key]: value } : b)));
  }

  function updateFaqItem(id: string, idx: number, key: 'q' | 'a', value: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const items = [...((b as any).items ?? [])];
        items[idx] = { ...items[idx], [key]: value };
        return { ...b, items } as PageBlock;
      })
    );
  }

  function addFaqItem(id: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const items = [...((b as any).items ?? [])];
        items.push({ q: 'Pertanyaan baru?', a: 'Jawaban.' });
        return { ...b, items } as PageBlock;
      })
    );
  }

  function removeFaqItem(id: string, idx: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const items = [...((b as any).items ?? [])];
        items.splice(idx, 1);
        return { ...b, items } as PageBlock;
      })
    );
  }

  async function save() {
    if (!token || !page) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await upsertWebPage(token, {
        id: page.id,
        slug: page.slug,
        title: page.title,
        blocks,
        is_published: page.is_published,
      });
      setOk('Blok tersimpan! Perubahan langsung tampil di storefront.');
    } catch (e: any) {
      setError(e?.message ?? 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  const storeName = webStore?.store_name ?? '';
  const subdomain = webStore?.subdomain_hash ?? '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Link href="/owner/web-store/pages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 mb-4">
          <ArrowLeft size={16} /> Kembali ke Pages
        </Link>
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-medium">Memuat editor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/owner/web-store/pages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <ArrowLeft size={16} /> Kembali ke Pages
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            {page?.title ?? 'Halaman'}
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">{page?.slug}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview((p) => !p)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              preview ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye size={16} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Simpan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={16} /> {ok}
        </div>
      )}

      {preview ? (
        /* ---------- Preview mode ---------- */
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-white text-xs px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono">{storeName || subdomain} — preview storefront</span>
          </div>
          <div className="bg-slate-100 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow overflow-hidden">
              {blocks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">Belum ada blok. Tambahkan blok untuk mulai.</div>
              ) : (
                blocks.map((b) => <BlockPreview key={b.id} block={b} webStore={webStore} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Edit mode ---------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Block palette */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Tambah Blok
            </h3>
            <div className="space-y-2">
              {BLOCK_DEFS.map((def) => (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <def.icon size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800">{def.label}</div>
                    <div className="text-[11px] text-slate-400">{def.type}</div>
                  </div>
                  <Plus size={16} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Blocks list */}
          <div className="lg:col-span-8 space-y-4">
            {blocks.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 text-sm">
                Halaman masih kosong. Pilih blok di kiri untuk mulai membangun.
              </div>
            )}
            {blocks.map((block, bi) => {
              const def = defFor(block);
              const b = block as any;
              return (
                <div key={block.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <def.icon size={16} className="text-blue-600" />
                      <span className="text-sm font-bold text-slate-800">{def.label}</span>
                      <span className="text-[10px] text-slate-400">#{bi + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveBlock(block.id, -1)} disabled={bi === 0} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600" aria-label="Naik">
                        <ChevronUp size={16} />
                      </button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={bi === blocks.length - 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600" aria-label="Turun">
                        <ChevronDown size={16} />
                      </button>
                      <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500" aria-label="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {def.fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                        {f.kind === 'textarea' ? (
                          <textarea
                            value={String(b[f.key] ?? '')}
                            onChange={(e) => updateBlock(block.id, f.key, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : f.kind === 'color' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={String(b[f.key] ?? '#000000')}
                              onChange={(e) => updateBlock(block.id, f.key, e.target.value)}
                              className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={String(b[f.key] ?? '')}
                              onChange={(e) => updateBlock(block.id, f.key, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                        ) : f.kind === 'number' ? (
                          <input
                            type="number"
                            value={String(b[f.key] ?? '')}
                            onChange={(e) => updateBlock(block.id, f.key, Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(b[f.key] ?? '')}
                            onChange={(e) => updateBlock(block.id, f.key, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}

                    {/* FAQ items */}
                    {block.type === 'faq' && (
                      <div className="mt-2 space-y-2">
                        {(b.items ?? []).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">FAQ #{idx + 1}</span>
                              <button onClick={() => removeFaqItem(block.id, idx)} className="p-1 rounded hover:bg-rose-100 text-rose-500" aria-label="Hapus item">
                                <X size={14} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={it.q}
                              onChange={(e) => updateFaqItem(block.id, idx, 'q', e.target.value)}
                              placeholder="Pertanyaan"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                              value={it.a}
                              onChange={(e) => updateFaqItem(block.id, idx, 'a', e.target.value)}
                              placeholder="Jawaban"
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => addFaqItem(block.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Plus size={14} /> Tambah item FAQ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
