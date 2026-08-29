'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { upsertWebPage } from '@/graphql/mutation/webstore';
import type { WebPage } from '@/graphql/query/webstore';
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
} from 'lucide-react';
import { BLOCK_DEFS, DEF_MAP, normalizeBlocks, serializeBlocks, type StructuralBlock } from '@/lib/blockSchema';
import { BlockFieldInput, BlockRemoveButton } from '@/components/owner/BlockFieldInput';

/**
 * Editor halaman web store — schema-driven section builder.
 *
 * - Kiri: library blok ombot (dari BLOCK_DEFS)
 * - Tengah: kanvas dengan drag & drop reorder (@dnd-kit)
 * - Kanan: panel properti per blok (Content / Design), auto-generate dari skema
 * - Live preview: render blok dengan style yang sama seperti storefront
 */

// ---------- Sortable wrapper ----------
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer" onClick={onSelect}>
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
          <span className="text-sm font-bold text-slate-800 truncate">
            {DEF_MAP[block.type]?.label ?? block.type}
          </span>
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

// ---------- Live block preview (mirror renderer storefront) ----------
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
            <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-bold">
              {b.cta_text}
            </span>
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
                <div className="h-2 w-1/2 mx-auto mt-1 rounded bg-slate-200" />
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
          {b.button_text && (
            <span className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white text-indigo-700 text-xs font-bold">
              {b.button_text}
            </span>
          )}
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
    default:
      return null;
  }
}

// ---------- Editor page ----------
export default function PageEditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params?.pageId ?? '';

  const [token, setToken] = useState('');
  const [page, setPage] = useState<WebPage | null>(null);
  const [webStore, setWebStore] = useState<any>(null);
  const [blocks, setBlocks] = useState<StructuralBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

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
        const normalized = normalizeBlocks(pg.blocks);
        setBlocks(normalized);
        setSelectedId(normalized[0]?.id ?? null);
      } catch (e: any) {
        setError(e?.message ?? 'Gagal memuat halaman');
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  const defFor = (b: StructuralBlock) => DEF_MAP[b.type] ?? DEF_MAP.text;
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function addBlock(type: string) {
    const def = DEF_MAP[type];
    if (!def) return;
    const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const props: Record<string, unknown> = {};
    for (const f of def.props) props[f.key] = JSON.parse(JSON.stringify(f.default ?? def.defaults[f.key]));
    const style: Record<string, unknown> = {};
    for (const f of def.style ?? []) style[f.key] = f.default ?? undefined;
    const nb: StructuralBlock = { id, type: type as any, props, style, layout: {} };
    setBlocks((prev) => [...prev, nb]);
    setSelectedId(id);
    setActiveTab('content');
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
        blocks: serializeBlocks(blocks),
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
                blocks.map((b) => <BlockLivePreview key={b.id} block={b} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Edit mode ---------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Block palette */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
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
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{def.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{def.description}</div>
                  </div>
                  <Plus size={16} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
              💡 Seret blok untuk mengubah urutan, atau klik blok untuk mengedit konten & desainnya.
            </div>
          </div>

          {/* Canvas */}
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

          {/* Property panel */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:sticky lg:top-4">
            {!selected ? (
              <div className="text-sm text-slate-400 text-center py-8">
                Pilih blok untuk mengedit propertinya.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {(() => { const Icon = defFor(selected).icon; return <Icon size={16} className="text-blue-600" />; })()}
                    {defFor(selected).label}
                  </h3>
                  <div className="flex rounded-xl border border-slate-200 p-0.5">
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                        activeTab === 'content' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Settings2 size={12} /> Konten
                    </button>
                    <button
                      onClick={() => setActiveTab('design')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                        activeTab === 'design' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Palette size={12} /> Desain
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeTab === 'content'
                    ? defFor(selected).props.map((f) => (
                        <BlockFieldInput
                          key={f.key}
                          field={f}
                          value={selected.props[f.key]}
                          onChange={(v) => updateProp(selected.id, f.key, v)}
                        />
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
                        <div className="text-xs text-slate-400 py-4 text-center">
                          Blok ini belum punya pengaturan desain.
                        </div>
                      )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
