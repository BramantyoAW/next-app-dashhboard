'use client';

import { useEffect, useMemo, useState } from 'react';
import { puckLabConfig } from '@/lib/puckLabConfig';
import type { PuckDynamic } from '@/lib/puckDynamic';
import { PuckDynamicContext } from '@/lib/puckDynamic';

type PuckBlock = { id?: string; type?: string; props?: Record<string, unknown>; style?: Record<string, unknown>; [k: string]: unknown };
type Change = {
  field?: string;
  from?: unknown;
  to?: unknown;
  description?: string;
};

type ChangedBlock = { change: Change; block: PuckBlock | null; newBlocks: PuckBlock[]; ops: any[] };

/** Op yang paham cara preview-nya (sisanya = tak bisa digambar → beri alasan). */
const PREVIEWABLE_OPS = ['update_block', 'append_blocks', 'prepend_blocks', 'replace_blocks', 'remove_block', 'reorder_blocks'];

/** Ambil semua blok yang disentuh usulan AI (update_block / append / replace). */
export function changedBlocksOf(data: { content?: unknown[] } | null, changes: Change[]): ChangedBlock[] {
  if (!data || !Array.isArray(data.content)) return [];
  const out: ChangedBlock[] = [];
  for (const change of changes) {
    const to = change.to as { slug?: string; ops?: any[] } | null;
    const field = change.field || '';
    const isBlockOps = field === 'block_ops' || field.startsWith('block_ops:');
    if (!isBlockOps || !to || !Array.isArray(to.ops)) continue;
    const update = to.ops.find((o) => o?.op === 'update_block');
    const block = update?.id
      ? (data.content as PuckBlock[]).find((b) => b.props?.id === update.id || b.id === update.id) ?? null
      : null;
    // append/prepend/replace membawa blok baru yang belum ada di kanvas —
    // itu yang dipreview sebagai "SESUDAH", bukan hasil pencarian blok lama.
    const newBlocks: PuckBlock[] = [];
    for (const op of to.ops) {
      if (!['append_blocks', 'prepend_blocks', 'replace_blocks'].includes(op?.op)) continue;
      for (const b of Array.isArray(op.blocks) ? op.blocks : []) {
        if (b && typeof b === 'object' && typeof b.type === 'string') newBlocks.push(b as PuckBlock);
      }
    }
    out.push({ change, block, newBlocks, ops: to.ops });
  }
  return out;
}

/** Render satu blok standalone (render func dari config — sudah handle scoped css/js). */
function BlockPreview({ block, forceCss }: { block: PuckBlock; forceCss?: Record<string, unknown> }) {
  const [err, setErr] = useState('');
  const [dynamic, setDynamic] = useState<PuckDynamic>({
    hash: '',
    storeName: 'Toko Cupelis',
    product: null,
    products: [],
    cart: [],
  });

  useEffect(() => {
    try {
      const def = (puckLabConfig.components as any)[block.type ?? ''];
      if (!def?.render) {
        setErr(`Blok "${block.type}" tidak dikenal`);
        return;
      }
    } catch {
      setErr('Gagal siapkan preview');
    }
  }, [block.type]);

  const rendered = useMemo(() => {
    try {
      const def = (puckLabConfig.components as any)[block.type ?? ''];
      if (!def?.render) return null;
      // props asli + css/js yang di-force (usulan AI) utk "sesudah"
      const props: Record<string, unknown> = { ...(block.props ?? {}), ...(forceCss ?? {}) };
      // Render sbg ELEMEN React (bukan panggil fungsi) supaya hook di dalam
      // render func (bila ada) dikelola React per instance — aman saat banyak
      // preview dirender sekaligus (full message).
      const El = def.render;
      return <El {...props} />;
    } catch {
      return null;
    }
  }, [block, forceCss]);

  if (err) return <div className="p-2 text-xs text-red-500">{err}</div>;
  if (!rendered) return <div className="p-2 text-xs text-slate-400">Blok tak bisa dirender</div>;

  return (
    <div className="pointer-events-none scale-[0.85] origin-top-left overflow-hidden" style={{ width: '120%' }}>
      <PuckDynamicContext.Provider value={dynamic}>{rendered}</PuckDynamicContext.Provider>
    </div>
  );
}

/** Preview sebelum/sesudah untuk satu usulan perubahan blok. */
export function AiChangePreview({ block, change, newBlocks }: { block: PuckBlock | null; change: Change; newBlocks?: PuckBlock[] }) {
  // Blok baru hasil append/prepend/replace: tidak ada "SEBELUM" — hanya SESUDAH.
  const newSection = newBlocks && newBlocks.length > 0 ? (
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Preview blok</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">blok baru</span>
        </div>
        <div className="space-y-2">
          {newBlocks.map((b, i) => (
            <div key={b.props?.id ? String(b.props.id) : i}>
              <div className="mb-1 text-center text-[10px] font-bold uppercase text-emerald-600">
                SESUDAH · {b.type}
              </div>
              <div className="max-h-44 overflow-hidden rounded-lg border-2 border-emerald-200 bg-emerald-50/40">
                <BlockPreview block={b} />
              </div>
            </div>
          ))}
        </div>
      </div>
  ) : null;

  if (!block) {
    // Tak ada blok lama untuk dibandingkan (mis. op hanya remove/reorder atau
    // tipe yang tak dikenal). Jangan kotak kosong: sebut alasannya.
    const ops = (change.to as { ops?: any[] } | null)?.ops ?? [];
    const unknown = ops.map((o) => String(o?.op ?? '')).filter((op) => op && !PREVIEWABLE_OPS.includes(op));
    return (
      <>
        {newSection}
        <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          <div>{change.description || 'Perubahan blok — blok target tidak ditemukan di kanvas.'}</div>
          {unknown.length > 0 && (
            <div className="mt-1 text-slate-400">
              Jenis perubahan “{unknown.join(', ')}” belum bisa dipreview di panel ini — cek hasilnya setelah Terapkan.
            </div>
          )}
        </div>
      </>
    );
  }

  // Props "sesudah": gabung usulan update_block props ke props asli.
  const to = change.to as { ops?: any[] } | null;
  const update = to?.ops?.find((o) => o?.op === 'update_block');
  const afterProps = update?.props && typeof update.props === 'object' && !Array.isArray(update.props)
    ? { ...(block.props ?? {}), ...(update.props as Record<string, unknown>) }
    : block.props;

  const afterBlock: PuckBlock = { ...block, props: afterProps };

  // Field yang berubah (utk diff list di bawah preview)
  const changed: { key: string; before: unknown; after: unknown }[] = [];
  const beforeP = block.props ?? {};
  for (const [k, v] of Object.entries(afterProps ?? {})) {
    if (k === 'id') continue;
    const oldV = beforeP[k];
    const isCss = k === 'css' || k === 'js';
    const same = isCss ? String(oldV ?? '') === String(v ?? '') : JSON.stringify(oldV) === JSON.stringify(v);
    if (!same) changed.push({ key: k, before: oldV, after: v });
  }

  const hasCss = changed.some((c) => c.key === 'css' || c.key === 'js');

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
      {newSection}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Preview blok</span>
        {hasCss && (
          <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700">
            {changed.filter((c) => c.key === 'css' || c.key === 'js').map((c) => c.key.toUpperCase()).join(' + ')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-center text-[10px] font-bold text-slate-400">SEBELUM</div>
          <div className="max-h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <BlockPreview block={block} />
          </div>
        </div>
        <div>
          <div className="mb-1 text-center text-[10px] font-bold text-emerald-600">SESUDAH</div>
          <div className="max-h-44 overflow-hidden rounded-lg border-2 border-emerald-200 bg-emerald-50/40">
            <BlockPreview block={afterBlock} />
          </div>
        </div>
      </div>

      {/* Diff ringkas field teks */}
      {changed.filter((c) => !['css', 'js'].includes(c.key)).length > 0 && (
        <div className="mt-2 space-y-1">
          {changed
            .filter((c) => !['css', 'js'].includes(c.key))
            .slice(0, 4)
            .map((c) => (
              <div key={c.key} className="rounded bg-slate-50 px-2 py-1 text-[11px]">
                <span className="font-bold text-slate-500">{c.key}:</span>{' '}
                <span className="text-slate-400 line-through">{String(c.before ?? '—').slice(0, 40)}</span>
                {' → '}
                <span className="font-semibold text-emerald-700">{String(c.after ?? '').slice(0, 60)}</span>
              </div>
            ))}
        </div>
      )}
      {hasCss && (
        <div className="mt-2 rounded bg-slate-900 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-emerald-300">
          {changed
            .filter((c) => c.key === 'css' || c.key === 'js')
            .map((c) => (
              <div key={c.key} className="whitespace-pre-wrap break-words">
                <span className="text-slate-400">/* {c.key}: +{String(c.after ?? '').length} karakter */</span>
                {String(c.after ?? '').slice(0, 400)}
                {String(c.after ?? '').length > 400 ? '…' : ''}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
