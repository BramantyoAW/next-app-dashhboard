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
import { BLOCK_DEFS, DEF_MAP, normalizeBlocks, normalizeBlock, serializeBlocks, type StructuralBlock } from '@/lib/blockSchema';
import { BlockFieldInput, BlockRemoveButton } from '@/components/owner/BlockFieldInput';
import { CanvasBlockRenderer } from '@/components/web-store/CanvasBlockRenderer';
import { WebStoreAiAssistant } from '@/components/web-store/WebStoreAiAssistant';
import type { AiChangeSuggestion } from '@/graphql/mutation/aiAssistant';
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

// ---------- Sortable block wrapper (Stitch mode: ring + toolbar overlay) ----------
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
        boxShadow: selected ? '0 0 0 2px var(--ds-primary)' : undefined,
        borderRadius: selected ? 'var(--ds-radius-sm)' : undefined,
      }}
      className="relative group"
    >
      {/* Drag handle — selalu tampil di hover, diseret untuk reorder */}
      <button
        {...attributes}
        {...listeners}
        className={`absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-md shadow-md hover:opacity-90 group-hover:flex ${selected ? 'flex' : ''}`}
        style={{ background: 'var(--ds-fg)', color: 'var(--ds-surface)' }}
        aria-label="Seret untuk pindah"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </button>

      {/* Toolbar kecil di pojok kanan atas — hanya untuk blok terpilih */}
      {selected && (
        <div
          className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg px-1 py-0.5 shadow-md"
          style={{ background: 'var(--ds-fg)', color: 'var(--ds-surface)' }}
        >
          <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 hover:opacity-70 disabled:opacity-30" aria-label="Naik">
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-1 hover:opacity-70 disabled:opacity-30" aria-label="Turun">
            <ChevronDown size={13} />
          </button>
          <span className="mx-0.5 h-3.5 w-px" style={{ background: 'currentColor', opacity: 0.3 }} />
          <BlockRemoveButton onClick={onRemove} />
        </div>
      )}

      <div className="relative cursor-pointer" onClick={() => onSelect()} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

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
    if (Array.isArray(obj.props)) {
      const arr = obj.props as unknown[];
      const props: Record<string, unknown> = {};
      if (arr.length > 0 && arr.every((it) => it && typeof it === 'object' && !Array.isArray(it))) {
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

  /** Apply AI changes: theme / chrome / theme_color / page blocks / block ops. */
  function applyAiChanges(changes: AiChangeSuggestion[]) {
    let applied = 0;
    let skipped = 0;
    for (const change of changes) {
      if ((change.field === 'theme' || change.field === 'web_store.theme') && change.to && typeof change.to === 'object') {
        setTheme((prev) => normalizeTheme({ ...prev, ...(change.to as Record<string, unknown>) }));
        applied++;
      } else if ((change.field === 'theme_color' || change.field === 'web_store.theme_color') && typeof change.to === 'string') {
        setThemeColor(change.to);
        applied++;
      } else if ((change.field === 'current_page' || change.field === 'page') && change.to && typeof change.to === 'object') {
        const value = change.to as { slug?: string; title?: string; blocks?: unknown[] };
        // Terapkan ke halaman aktif (slug boleh mengarah halaman lain → pindah).
        const targetSlug = value.slug && pages.some((p) => p.slug === value.slug) ? value.slug : activeSlug;
        const t = targetSlug;
        if (value.title) setPageTitle(String(value.title));
        if (Array.isArray(value.blocks)) {
          const structural = toStructural(value.blocks, 0);
          if (t === activeSlug) {
            setBlocks(structural);
            setSelectedId(structural[0]?.id ?? null);
          } else {
            setPages((prev) => prev.map((p) => (p.slug === t ? { ...p, blocks: structural.map((s) => JSON.parse(JSON.stringify(s))) as WebPage['blocks'] } : p)));
          }
          applied++;
        }
      } else if (change.field.startsWith('page:') && change.to && typeof change.to === 'object') {
        const slug = change.field.slice('page:'.length);
        const value = change.to as { slug?: string; blocks?: unknown[]; title?: string };
        const targetSlug = value.slug && pages.some((p) => p.slug === value.slug) ? value.slug : slug;
        const structural = Array.isArray(value.blocks) ? toStructural(value.blocks, 0) : null;
        setPages((prev) => prev.map((p) => {
          if (p.slug !== targetSlug) return p;
          const next = { ...p };
          if (value.title) next.title = String(value.title);
          if (structural) next.blocks = structural.map((s) => JSON.parse(JSON.stringify(s))) as WebPage['blocks'];
          return next;
        }));
        if (structural && targetSlug === activeSlug) {
          setBlocks(structural);
          setSelectedId(structural[0]?.id ?? null);
        }
        applied++;
      } else if (change.field.includes('block') && change.to && typeof change.to === 'object') {
        const payload = change.to as { slug?: string; ops?: BlockOp[] };
        const slug = payload.slug && pages.some((p) => p.slug === payload.slug) ? payload.slug : activeSlug;
        const ops = Array.isArray(payload.ops) ? payload.ops : [];
        let used = 0;
        const structural = [...blocks];
        for (const op of ops) {
          switch (op.op) {
            case 'append_blocks': { structural.push(...toStructural(op.blocks, structural.length)); used++; break; }
            case 'prepend_blocks': { structural.unshift(...toStructural(op.blocks, 0)); used++; break; }
            case 'replace_blocks': { const nb = toStructural(op.blocks, 0); structural.length = 0; structural.push(...nb); used++; break; }
            case 'update_block': {
              const target = structural.find((b) => b.id === op.id);
              if (!target) continue;
              if (op.props && typeof op.props === 'object') target.props = { ...target.props, ...op.props };
              if (op.style && typeof op.style === 'object') target.style = { ...target.style, ...op.style };
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
                if (b) { reordered.push(b); map.delete(String(id)); }
              }
              reordered.push(...map.values());
              structural.length = 0;
              structural.push(...reordered);
              used++;
              break;
            }
          }
        }
        if (used > 0) {
          if (slug === activeSlug) {
            setBlocks(structural);
          } else {
            setPages((prev) => prev.map((p) => (p.slug === slug ? { ...p, blocks: structural.map((s) => JSON.parse(JSON.stringify(s))) as WebPage['blocks'] } : p)));
          }
          applied++;
        }
      } else {
        skipped++;
      }
    }
    setStatus(applied > 0
      ? { kind: 'ok', msg: `Usulan AI diterapkan (${applied} perubahan${skipped > 0 ? `, ${skipped} dilewati` : ''}). Klik Simpan untuk publish.` }
      : { kind: 'err', msg: 'Tidak ada usulan yang bisa diterapkan ke builder ini.' });
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
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--ds-fg-muted)' }}>
        <Link href="/owner/web-store" className="inline-flex items-center gap-1.5 text-sm ds-link mb-4">
          <ArrowLeft size={8} /> Kembali ke Setup
        </Link>
        <Loader2 className="animate-spin ds-accent-text" size={32} />
        <span className="text-sm font-medium">Memuat builder...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="ds-page-head">
        <div>
          <Link href="/owner/web-store" className="inline-flex items-center gap-1.5 text-sm ds-link">
            <ArrowLeft size={16} /> Kembali ke Setup
          </Link>
          <h1 className="ds-display flex items-center gap-2" style={{ marginTop: 4 }}>
            <Blocks size={22} className="ds-accent-text" /> Page Builder
            <span
              className="uppercase tracking-wide"
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: 'var(--ds-surface-2)',
                border: '1px solid var(--ds-border)',
                color: 'var(--ds-primary)',
              }}
            >
              Tema + Blok
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeSlug}
            onChange={(e) => {
              const p = pages.find((x) => x.slug === e.target.value);
              if (p) selectPage(p);
            }}
            className="ds-select"
            style={{ width: 'auto' }}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title || p.slug} ({p.slug})
              </option>
            ))}
          </select>
          <button
            onClick={() => setPreview((p) => !p)}
            className="ds-btn"
            data-variant={preview ? 'primary' : 'secondary'}
          >
            <Eye size={16} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving || !activePage}
            className="ds-btn"
            data-variant="primary"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Simpan
          </button>
        </div>
      </div>

      {status && (
        <div className="ds-alert" data-tone={status.kind === 'ok' ? 'ok' : 'bad'}>
          {status.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {status.msg}
        </div>
      )}

      {preview ? (
        /* ---------- Preview mode (kanvas full-page tanpa navbar) ---------- */
        <div className="ds-card overflow-hidden">
          <div
            className="text-xs px-4 py-2 flex items-center gap-2"
            style={{ background: 'var(--ds-fg)', color: 'var(--ds-surface)' }}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2 ds-mono" style={{ color: 'inherit' }}>{webStore?.store_name ?? ''} — preview full-page (tanpa navbar)</span>
          </div>
          <div className="p-6" style={{ background: 'var(--ds-surface-2)' }}>
            <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
            <div className="max-w-3xl mx-auto ds-card overflow-hidden">
              {blocks.length === 0 ? (
                <div className="ds-empty ds-small">Belum ada blok. Tambahkan blok untuk mulai.</div>
              ) : (
                blocks.map((b) => <CanvasBlockRenderer key={b.id} block={b} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Edit mode ---------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Blok / Tema */}
          <div className="lg:col-span-3 ds-card ds-card-pad">
            <div className="flex ds-well mb-4" style={{ padding: 2 }}>
              {([
                { key: 'blocks' as const, label: 'Blok', icon: Plus },
                { key: 'theme' as const, label: 'Tema', icon: Palette },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setLeftTab(t.key)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  style={leftTab === t.key ? { background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' } : { background: 'transparent', color: 'var(--ds-fg-muted)' }}
                >
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            {leftTab === 'blocks' ? (
              <div className="space-y-2">
                <h3 className="ds-h2 mb-2">Tambah Blok</h3>
                {BLOCK_DEFS.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addBlock(def.type)}
                    className="ds-subcard w-full flex items-center gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center ds-icon-muted" style={{ background: 'var(--ds-surface)' }}>
                      <def.icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="ds-body truncate" style={{ fontWeight: 600 }}>{def.label}</div>
                      <div className="ds-caption truncate">{def.description}</div>
                    </div>
                    <Plus size={16} className="ds-icon-muted shrink-0" />
                  </button>
                ))}
                <div className="ds-well mt-3" data-tone="accent">
                  💡 Seret blok untuk urutan, klik blok untuk ubah konten & desain.
                </div>
              </div>
            ) : (
              /* Tema editor */
              <div className="space-y-4">
                <div>
                  <span className="ds-section-label">Preset Tema</span>
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
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors"
                          style={
                            active
                              ? { background: 'var(--ds-primary)', border: '1px solid var(--ds-primary)', color: 'var(--ds-primary-fg)' }
                              : { background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)', color: 'var(--ds-fg-muted)' }
                          }
                        >
                          <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: p.theme.colors.brand }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="ds-section-label">Font</span>
                  <select
                    value={theme.font}
                    onChange={(e) => setTheme((t) => ({ ...t, font: e.target.value }))}
                    className="ds-select mt-1.5"
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
                      <span className="ds-caption">{label}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="color"
                          value={theme.colors[key]}
                          onChange={(e) => setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="w-9 h-9 rounded-lg cursor-pointer p-0.5"
                          style={{ border: '1px solid var(--ds-border)' }}
                        />
                        <input
                          type="text"
                          value={theme.colors[key]}
                          onChange={(e) => setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="ds-input ds-mono uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="ds-section-label">Radius (px)</span>
                    <input
                      type="number"
                      min={0} max={48}
                      value={theme.radius}
                      onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) || 0 }))}
                      className="ds-input mt-1.5"
                    />
                  </div>
                  <div>
                    <span className="ds-section-label">Gaya Tombol</span>
                    <select
                      value={theme.buttonStyle}
                      onChange={(e) => setTheme((t) => ({ ...t, buttonStyle: e.target.value as WebTheme['buttonStyle'] }))}
                      className="ds-select mt-1.5"
                    >
                      <option value="rounded">Membulat</option>
                      <option value="pill">Pill</option>
                      <option value="square">Kotak</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="ds-section-label">Custom CSS</span>
                  <textarea
                    rows={5}
                    value={theme.custom_css}
                    onChange={(e) => setTheme((t) => ({ ...t, custom_css: e.target.value }))}
                    placeholder=".hero { ... }"
                    className="ds-textarea ds-mono mt-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE: Canvas (Stitch — render halaman utuh, klik blok untuk edit) */}
          <div className="lg:col-span-6">
            {blocks.length === 0 ? (
              <div
                className="ds-empty ds-small"
                style={{ border: '1px dashed var(--ds-border-strong)', borderRadius: 'var(--ds-radius)', background: 'var(--ds-surface)' }}
              >
                Halaman masih kosong. Pilih blok di kiri untuk mulai membangun.
              </div>
            ) : (
              <div className="p-4 sm:p-8" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-radius)' }}>
                {/* Tema aktif: font/warna/radius dipakai render blok */}
                <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />
                <div className="mx-auto ds-card overflow-hidden min-h-[400px]">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      <div>
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
                            <CanvasBlockRenderer block={block} />
                          </SortableBlock>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
                <p className="ds-caption mt-2 text-center">
                  💡 Klik blok untuk memilih → ubah di panel kanan. Seret handle ⠿ (hover kiri) untuk urutan. Halaman ini dirender full-page tanpa navbar.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Property panel */}
          <div className="lg:col-span-3 ds-card ds-card-pad lg:sticky lg:top-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="ds-h2 flex items-center gap-2">
                    {(() => { const Icon = defFor(selected).icon; return <Icon size={16} className="ds-accent-text" />; })()}
                    {defFor(selected).label}
                  </h3>
                  <div className="flex ds-well" style={{ padding: 2 }}>
                    <button
                      onClick={() => setPropTab('content')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      style={propTab === 'content' ? { background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' } : { background: 'transparent', color: 'var(--ds-fg-muted)' }}
                    >
                      <Settings2 size={12} /> Konten
                    </button>
                    <button
                      onClick={() => setPropTab('design')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      style={propTab === 'design' ? { background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' } : { background: 'transparent', color: 'var(--ds-fg-muted)' }}
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
                        <div className="ds-note">Blok ini belum punya pengaturan desain.</div>
                      )}
                </div>
              </>
            ) : (
              /* Page settings */
              <div className="space-y-4">
                <h3 className="ds-h2 flex items-center gap-2">
                  <Globe size={16} className="ds-accent-text" /> Pengaturan Halaman
                </h3>
                <div>
                  <label className="ds-label">Judul Halaman</label>
                  <input
                    type="text"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="ds-input"
                  />
                </div>
                <div>
                  <span className="ds-label">Slug</span>
                  <span className="ds-well ds-mono inline-block w-full">
                    /storefront/{webStore?.subdomain_hash ?? ''}/{activeSlug || 'home'}
                  </span>
                </div>
                <label className="ds-body flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pagePub} onChange={(e) => setPagePub(e.target.checked)} className="ds-switch" />
                  Terbitkan halaman
                </label>
                <label className="ds-body flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pageFull} onChange={(e) => setPageFull(e.target.checked)} className="ds-switch" />
                  Mode layar penuh (tanpa navbar)
                </label>
                <p className="ds-hint">
                  Mode layar penuh = halaman dirender tanpa header/footer global; akses keranjang & akun lewat floating mini-bar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Assistant — generate/edit halaman via chat */}
      <WebStoreAiAssistant
        webStoreId={webStore?.id ?? null}
        scope="homepage"
        context={{
          scope: 'homepage',
          route: '/owner/web-store/builder',
          store: { name: webStore?.store_name ?? '', subdomain: webStore?.subdomain_hash ?? '' },
          theme,
          current_page: activePage
            ? { slug: activePage.slug, title: pageTitle, blocks: serializeBlocks(blocks) }
            : null,
          pages: pages.map((p) => ({ slug: p.slug, title: p.title, block_count: (p.blocks ?? []).length })),
        }}
        onApply={applyAiChanges}
      />
    </div>
  );
}