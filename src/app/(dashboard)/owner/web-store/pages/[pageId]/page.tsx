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
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { BLOCK_DEFS, DEF_MAP, normalizeBlocks, serializeBlocks, ensurePageShell, type StructuralBlock } from '@/lib/blockSchema';
import { BlockRemoveButton } from '@/components/owner/BlockFieldInput';
import { CanvasBlockRenderer } from '@/components/web-store/CanvasBlockRenderer';
import { normalizeTheme, themeToCss, type WebTheme } from '@/lib/webTheme';

/**
 * Editor halaman web store — schema-driven section builder.
 *
 * - Kiri: library blok ombot (dari BLOCK_DEFS)
 * - Tengah: kanvas dengan drag & drop reorder (@dnd-kit)
 * - Kanan: panel properti per blok (Content / Design), auto-generate dari skema
 * - Live preview: render blok dengan style yang sama seperti storefront
 */

// ---------- Sortable block (Stitch: render utuh, ring + toolbar overlay) ----------
function SortableBlock({
  block,
  index,
  total,
  selected,
  onSelect,
  onRemove,
  onMove,
  onField,
}: {
  block: StructuralBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onField?: (blockId: string, key: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }}
      className={`relative group ${selected ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100' : ''}`}
    >
      {/* Drag handle - muncul saat hover / terpilih */}
      <button
        {...attributes}
        {...listeners}
        className={`absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-md bg-slate-900 p-1 text-white shadow-md hover:bg-blue-600 group-hover:flex ${selected ? 'flex' : ''}`}
        aria-label="Seret untuk pindah"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>
      {/* Toolbar apung untuk blok terpilih */}
      {selected && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg bg-slate-900 px-1 py-0.5 text-white shadow-md">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Naik">
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Turun">
            <ChevronDown size={13} />
          </button>
          <span className="mx-0.5 h-3.5 w-px bg-white/30" />
          <BlockRemoveButton onClick={onRemove} />
        </div>
      )}
      {/* Render blok utuh seperti storefront asli — teks langsung bisa diedit saat aktif */}
      <div
        className="relative cursor-pointer"
        onClick={() => {
          if (!selected) onSelect();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CanvasBlockRenderer block={block} activeBlockId={selected ? block.id : null} onField={onField} />
      </div>
    </div>
  );
}

export default function PageEditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params?.pageId ?? '';

  const [token, setToken] = useState('');
  const [page, setPage] = useState<WebPage | null>(null);
  const [webStore, setWebStore] = useState<any>(null);
  const [theme, setTheme] = useState<WebTheme | null>(null);
  const [blocks, setBlocks] = useState<StructuralBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        setTheme(normalizeTheme((ws.settings as any)?.theme ?? null));
        const normalized = ensurePageShell(normalizeBlocks(pg.blocks));
        setBlocks(normalized);
        setSelectedId(normalized[0]?.id ?? null);
      } catch (e: any) {
        setError(e?.message ?? 'Gagal memuat halaman');
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

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
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        // Dukung path bertitik: "nav.0.label", "items.2.q" (repeater inline edit)
        const keys = key.split('.');
        if (keys.length === 1) return { ...b, props: { ...b.props, [key]: value } };
        const props = structuredClone(b.props ?? {});
        let cur: any = props;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!cur[keys[i]]) cur[keys[i]] = {};
          cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = value;
        return { ...b, props };
      })
    );
  }

  /** Inline edit dari canvas: field teks langsung diketik → commit ke state. */
  function handleField(blockId: string, key: string, value: string) {
    updateProp(blockId, key, value);
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
    <div className="pb-16">
      {/* Toolbar atas (full-bleed, tipis) */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/owner/web-store/pages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <ArrowLeft size={16} /> Halaman
            </Link>
            <span className="hidden sm:inline h-4 w-px bg-slate-200" />
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              {page?.title ?? 'Halaman'}
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">{page?.slug}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview((p) => !p)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                preview ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye size={16} /> {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Simpan
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {ok && (
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={16} /> {ok}
        </div>
      )}

      <div className="px-4 md:px-6 pt-4">
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
            {theme && <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />}
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow overflow-hidden">
              {blocks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">Belum ada blok. Tambahkan blok untuk mulai.</div>
              ) : (
                blocks.map((b) => <CanvasBlockRenderer key={b.id} block={b} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Edit mode ---------- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Layout edit: palet kiri tipis + kanvas penuh (tanpa form kanan) */}
          <div className="lg:col-span-3 xl:col-span-2">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm lg:sticky lg:top-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Plus size={16} className="text-blue-600" /> Blok
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_DEFS.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addBlock(def.type)}
                    title={def.description}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 transition-colors"
                  >
                    <def.icon size={18} className="text-slate-600" />
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{def.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                💡 Klik teks di halaman untuk mengedit langsung. Seret handle ⠿ (hover) untuk pindah blok.
              </p>
            </div>
          </div>

          {/* Canvas lebar (full editing, tanpa form kanan) */}
          <div className="lg:col-span-9 xl:col-span-10">
            {blocks.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 text-sm">
                Halaman masih kosong. Pilih blok di kiri untuk mulai membangun.
              </div>
            ) : (
              <div className="bg-slate-100 rounded-2xl p-3 sm:p-6 border border-slate-200/60">
                {theme && <style dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />}
                <div className="mx-auto bg-white shadow-sm rounded-lg overflow-hidden min-h-[400px]">
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
                            onField={handleField}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
