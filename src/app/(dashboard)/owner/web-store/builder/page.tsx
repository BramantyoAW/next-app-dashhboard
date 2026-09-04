'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import type { WebPage } from '@/graphql/query/webstore';
import { upsertWebStore, upsertWebPage } from '@/graphql/mutation/webstore';
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
  GripVertical,
  Settings2,
  Palette,
  AlertCircle,
  CheckCircle2,
  Blocks,
  Globe,
} from 'lucide-react';
import { BLOCK_DEFS, DEF_MAP, normalizeBlocks, serializeBlocks, type StructuralBlock } from '@/lib/blockSchema';
import { BlockFieldInput, BlockRemoveButton } from '@/components/owner/BlockFieldInput';
import { CustomBlockRenderer } from '@/components/storefront/CustomBlockRenderer';
import {
  defaultTheme,
  normalizeTheme,
  THEME_PRESETS,
  FONT_OPTIONS,
  themeToCss,
  type WebTheme,
} from '@/lib/webTheme';

/**
 * Web Store Builder — satu workspace yang menggabungkan Tema (global) dan
 * Page Builder (blok per halaman) dalam mode Stitch: halaman dirender
 * full-page tanpa navbar.
 */

// ---------- Sortable block wrapper (mirror page editor) ----------
function SortableBlock({
  block,
  index,
  total,
  selected,
  onSelect,
  onRemove,
  onMove,
  children,
}: {
  block: StructuralBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined }}
      className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200/80'}`}
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
            aria-label="Seret untuk pindah"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </button>
          <span className="text-sm font-bold text-slate-800 truncate">{DEF_MAP[block.type]?.label ?? block.type}</span>
          <span className="text-[10px] text-slate-400 shrink-0">#{index + 1}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600" aria-label="Naik">
            <ChevronUp size={16} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-600" aria-label="Turun">
            <ChevronDown size={16} />
          </button>
          <BlockRemoveButton onClick={onRemove} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------- Live block preview (mirror storefront renderer/theme) ----------
function BlockLivePreview({ block }: { block: StructuralBlock }) {
  const b = block.props as Record<string, any>;
  const s = (block.style ?? {}) as Record<string, any>;
  const sectionStyle: React.CSSProperties = {};
  if (s.bg_color) sectionStyle.backgroundColor = String(s.bg_color);
  if (s.bg_image) {
    sectionStyle.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${s.bg_image})`;
    sectionStyle.backgroundSize = 'cover';
    sectionStyle.backgroundPosition = 'center';
  }
  if (s.text_color) sectionStyle.color = String(s.text_color);
  if (s.padding) sectionStyle.padding = String(s.padding);
  if (s.radius !== undefined && s.radius !== null && s.radius !== '') sectionStyle.borderRadius = `${s.radius}px`;
  if (s.align) sectionStyle.textAlign = String(s.align) as React.CSSProperties['textAlign'];

  switch (block.type) {
    case 'hero':
      return (
        <div className="rounded-xl px-6 py-8 text-center text-white" style={sectionStyle}>
          <h3 className="text-lg font-extrabold">{b.heading}</h3>
          {b.subheading && <p className="text-xs mt-1 opacity-80">{b.subheading}</p>}
          {b.cta_text && (
            <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-bold">{b.cta_text}</span>
          )}
        </div>
      );
    case 'text':
      return (
        <div className="p-4" style={sectionStyle}>
          <h3 className="text-sm font-bold text-slate-900">{b.heading}</h3>
          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap line-clamp-4">{b.body}</p>
        </div>
      );
    case 'products':
      return (
        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-900">{b.heading}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Array.from({ length: Math.min(Number(b.limit) || 2, 4) }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2 text-center">
                <div className="h-12 rounded-md bg-slate-100" />
                <div className="h-2 w-3/4 mx-auto mt-2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div className="p-5 text-center text-white" style={sectionStyle}>
          <h3 className="text-sm font-bold">{b.heading}</h3>
          {b.body && <p className="text-xs mt-1 opacity-90">{b.body}</p>}
          {b.button_text && <span className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white text-indigo-700 text-xs font-bold">{b.button_text}</span>}
        </div>
      );
    case 'faq':
      return (
        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-900">{b.heading}</h3>
          <div className="mt-2 space-y-1.5">
            {(Array.isArray(b.items) ? b.items : []).map((it: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs">
                <div className="font-bold text-slate-800">{it.q}</div>
                <div className="text-slate-500 mt-0.5 line-clamp-1">{it.a}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'custom':
      return (
        <div className="p-2">
          <CustomBlockRenderer html={String(b.html ?? '')} css={String(b.css ?? '')} js="" />
        </div>
      );
    case 'image':
      return b.image_url ? (
        <div className="p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(b.image_url)} alt={String(b.alt ?? '')} className="rounded-lg max-h-40 object-cover w-full" style={{ borderRadius: s.radius != null ? `${s.radius}px` : undefined }} />
        </div>
      ) : (
        <div className="p-4 text-xs text-slate-400 text-center">Blok Gambar — isi URL gambar</div>
      );
    case 'video':
      return (
        <div className="p-2">
          <div className="rounded-lg bg-slate-100 flex items-center justify-center h-24 text-xs text-slate-400">
            {b.video_url ? '▶ Video: ' + String(b.video_url) : 'Blok Video — isi URL (YouTube/MP4)'}
          </div>
        </div>
      );
    case 'divider':
      return (
        <div className="p-2">
          <hr style={{ borderTop: `${s.height ?? 1}px solid ${s.color ?? '#e2e8f0'}`, margin: s.margin ?? '24px 0' }} />
        </div>
      );
    default:
      return null;
  }
}

export default function WebStoreBuilderPage() {
  const [token, setToken] = useState('');
  const [webStore, setWebStore] = useState<any>(null);
  const [pages, setPages] = useState<WebPage[]>([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [blocks, setBlocks] = useState<StructuralBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'blocks' | 'theme'>('blocks');
  const [propTab, setPropTab] = useState<'content' | 'design'>('content');
  const [theme, setTheme] = useState<WebTheme>(defaultTheme());
  const [themeColor, setThemeColor] = useState('#0ea5e9');
  const [pageTitle, setPageTitle] = useState('');
  const [pageFull, setPageFull] = useState(false);
  const [pagePub, setPagePub] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activePage = useMemo(() => pages.find((p) => p.slug === activeSlug) ?? null, [pages, activeSlug]);

  useEffect(() => {
    const t = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
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
        const storeSettings = (ws.settings ?? {}) as any;
        setTheme(normalizeTheme(storeSettings.theme ?? null));
        setThemeColor(ws.theme_color ?? '#0ea5e9');
        const ps = ws.pages ?? [];
        setPages(ps);
        const first = ps.find((p: any) => p.slug === 'home') ?? ps[0];
        if (first) selectPage(first);
      } catch (e: any) {
        setStatus({ kind: 'err', msg: e?.message ?? 'Gagal memuat builder' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectPage(p: WebPage) {
    setActiveSlug(p.slug);
    setPageTitle(p.title ?? '');
    setPageFull(p.full_page ?? false);
    setPagePub(p.is_published ?? true);
    const normalized = normalizeBlocks(p.blocks);
    setBlocks(normalized);
    setSelectedId(normalized[0]?.id ?? null);
    setPreview(false);
    setStatus(null);
  }

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const defFor = (b: StructuralBlock) => DEF_MAP[b.type] ?? DEF_MAP.text;

  function addBlock(type: string) {
    const def = DEF_MAP[type];
    if (!def) return;
    const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const props: Record<string, unknown> = {};
    for (const f of def.props) props[f.key] = JSON.parse(JSON.stringify(f.default ?? def.defaults[f.key]));
    const style: Record<string, unknown> = {};
    for (const f of def.style ?? []) style[f.key] = f.default ?? undefined;
    setBlocks((prev) => [...prev, { id, type: type as any, props, style, layout: {} }]);
    setSelectedId(id);
    setPropTab('content');
    setPreview(false);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
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

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateProp(id: string, key: string, value: unknown) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)));
  }
  function updateStyle(id: string, key: string, value: unknown) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, style: { ...b.style, [key]: value } } : b)));
  }

  const save = useCallback(async () => {
    if (!token) return;
    setStatus(null);
    setSaving(true);
    try {
      if (webStore) {
        const storeSettings = (webStore.settings ?? {}) as any;
        await upsertWebStore(token, {
          store_id: webStore.store_id,
          slug: webStore.slug ?? null,
          subdomain_hash: webStore.subdomain_hash || null,
          store_name: webStore.store_name,
          theme_color: themeColor,
          tagline: webStore.tagline ?? null,
          is_active: webStore.is_active,
          settings: { ...storeSettings, theme },
        });
      }
      if (activePage) {
        await upsertWebPage(token, {
          id: activePage.id,
          slug: activePage.slug,
          title: pageTitle,
          blocks: serializeBlocks(blocks),
          is_published: pagePub,
          full_page: pageFull,
        });
        setPages((prev) => prev.map((p) =>
          p.id === activePage.id ? { ...p, title: pageTitle, blocks: serializeBlocks(blocks) as WebPage['blocks'], is_published: pagePub, full_page: pageFull } : p
        ));
      }
      setStatus({ kind: 'ok', msg: 'Perubahan tersimpan! Situs kini full-page tanpa navbar, cek storefront.' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  }, [token, webStore, theme, themeColor, activePage, blocks, pageTitle, pageFull, pagePub]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Link href="/owner/web-store" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 mb-4">
          <ArrowLeft size={8} /> Kembali ke Setup
        </Link>
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-medium">Memuat builder...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/owner/web-store" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <ArrowLeft size={16} /> Kembali ke Setup
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <Blocks size={22} className="text-blue-600" /> Page Builder
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-wide border border-indigo-100">
              Tema + Blok
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeSlug}
            onChange={(e) => {
              const p = pages.find((x) => x.slug === e.target.value);
              if (p) selectPage(p);
            }}
            className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title || p.slug} ({p.slug})
              </option>
            ))}
          </select>
          <button
            onClick={() => setPreview((p) => !p)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${preview ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <Eye size={16} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving || !activePage}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Simpan
          </button>
        </div>
      </div>

      {status && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${status.kind === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          {status.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {status.msg}
        </div>
      )}

      {preview ? (
        /* ---------- Preview mode (kanvas full-page tanpa navbar) ---------- */
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-white text-xs px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono">{webStore?.store_name ?? ''} — preview full-page (tanpa navbar)</span>
          </div>
          <div className="bg-slate-100 p-6">
            <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow overflow-hidden">
              {blocks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">Belum ada blok. Tambahkan blok untuk mulai.</div>
              ) : (
                blocks.map((b) => <BlockLivePreview key={b.id} block={b} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Edit mode ---------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Blok / Tema */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex rounded-xl border border-slate-200 p-0.5 mb-4">
              {([
                { key: 'blocks' as const, label: 'Blok', icon: Plus },
                { key: 'theme' as const, label: 'Tema', icon: Palette },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setLeftTab(t.key)}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${leftTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            {leftTab === 'blocks' ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Tambah Blok</h3>
                {BLOCK_DEFS.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addBlock(def.type)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <def.icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{def.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">{def.description}</div>
                    </div>
                    <Plus size={16} className="text-slate-300 shrink-0" />
                  </button>
                ))}
                <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
                  💡 Seret blok untuk urutan, klik blok untuk ubah konten & desain.
                </div>
              </div>
            ) : (
              /* Tema editor */
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preset Tema</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                          onClick={() => setTheme((prev) => ({ ...prev, ...p.theme, custom_css: prev.custom_css }))}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: p.theme.colors.brand }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Font</span>
                  <select
                    value={theme.font}
                    onChange={(e) => setTheme((t) => ({ ...t, font: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                          onChange={(e) => setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={theme.colors[key]}
                          onChange={(e) => setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Radius (px)</span>
                    <input
                      type="number"
                      min={0} max={48}
                      value={theme.radius}
                      onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) || 0 }))}
                      className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gaya Tombol</span>
                    <select
                      value={theme.buttonStyle}
                      onChange={(e) => setTheme((t) => ({ ...t, buttonStyle: e.target.value as WebTheme['buttonStyle'] }))}
                      className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                    >
                      <option value="rounded">Membulat</option>
                      <option value="pill">Pill</option>
                      <option value="square">Kotak</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom CSS</span>
                  <textarea
                    rows={5}
                    value={theme.custom_css}
                    onChange={(e) => setTheme((t) => ({ ...t, custom_css: e.target.value }))}
                    placeholder=".hero { ... }"
                    className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE: Canvas */}
          <div className="lg:col-span-6 space-y-4">
            {blocks.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 text-sm">
                Halaman masih kosong. Pilih blok di kiri untuk mulai membangun.
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {blocks.map((block, bi) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      index={bi}
                      total={blocks.length}
                      selected={selectedId === block.id}
                      onSelect={() => setSelectedId(block.id)}
                      onRemove={() => removeBlock(block.id)}
                      onMove={(dir) => moveBlock(block.id, dir)}
                    >
                      <div className="p-3">
                        <BlockLivePreview block={block} />
                      </div>
                    </SortableBlock>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* RIGHT: Property panel */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:sticky lg:top-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {(() => { const Icon = defFor(selected).icon; return <Icon size={16} className="text-blue-600" />; })()}
                    {defFor(selected).label}
                  </h3>
                  <div className="flex rounded-xl border border-slate-200 p-0.5">
                    <button
                      onClick={() => setPropTab('content')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${propTab === 'content' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <Settings2 size={12} /> Konten
                    </button>
                    <button
                      onClick={() => setPropTab('design')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${propTab === 'design' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <Palette size={12} /> Desain
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {propTab === 'content'
                    ? defFor(selected).props.map((f) => (
                        <BlockFieldInput key={f.key} field={f} value={selected.props[f.key]} onChange={(v) => updateProp(selected.id, f.key, v)} />
                      ))
                    : (defFor(selected).style ?? []).length > 0
                      ? defFor(selected).style!.map((f) => (
                          <BlockFieldInput
                            key={f.key}
                            field={f}
                            value={(selected.style as Record<string, unknown>)[f.key]}
                            onChange={(v) => updateStyle(selected.id, f.key, v)}
                          />
                        ))
                      : (
                        <div className="text-xs text-slate-400 py-4 text-center">Blok ini belum punya pengaturan desain.</div>
                      )}
                </div>
              </>
            ) : (
              /* Page settings */
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" /> Pengaturan Halaman
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Judul Halaman</label>
                  <input
                    type="text"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">Slug</span>
                  <span className="w-full inline-block px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-500">
                    /storefront/{webStore?.subdomain_hash ?? ''}/{activeSlug || 'home'}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={pagePub} onChange={(e) => setPagePub(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  Terbitkan halaman
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={pageFull} onChange={(e) => setPageFull(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  Mode layar penuh (tanpa navbar)
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mode layar penuh = halaman dirender tanpa header/footer global; akses keranjang & akun lewat floating mini-bar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}