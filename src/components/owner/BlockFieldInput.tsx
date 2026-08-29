'use client';

import { Plus, X, Trash2 } from 'lucide-react';
import type { FieldDef } from '@/lib/blockSchema';

/**
 * Input otomatis dari definisi field (schema-driven).
 * Mendukung: text, textarea, color, number, select, image (URL), repeater.
 */
export function BlockFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="block text-xs font-semibold text-slate-500 mb-1">{field.label}</label>
  );
  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

  switch (field.kind) {
    case 'textarea':
      return (
        <div>
          {label}
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={field.placeholder}
            className={inputCls}
          />
        </div>
      );
    case 'color':
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(String(value ?? '')) ? String(value) : '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer"
            />
            <input
              type="text"
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            min={field.min}
            max={field.max}
            className={inputCls}
          />
        </div>
      );
    case 'select':
      return (
        <div>
          {label}
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case 'image':
      return (
        <div>
          {label}
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? 'https://...'}
            className={inputCls}
          />
        </div>
      );
    case 'repeater':
      return (
        <div>
          {label}
          <div className="space-y-2">
            {(Array.isArray(value) ? value : []).map((item: Record<string, unknown>, idx: number) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {field.itemLabel ?? 'Item'} #{idx + 1}
                  </span>
                  <button
                    onClick={() => {
                      const arr = [...(Array.isArray(value) ? value : [])];
                      arr.splice(idx, 1);
                      onChange(arr);
                    }}
                    className="p-1 rounded hover:bg-rose-100 text-rose-500"
                    aria-label="Hapus item"
                  >
                    <X size={14} />
                  </button>
                </div>
                {(field.item ?? []).map((sub) => (
                  <div key={sub.key}>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">{sub.label}</label>
                    {sub.kind === 'textarea' ? (
                      <textarea
                        value={String(item?.[sub.key] ?? '')}
                        onChange={(e) => {
                          const arr = [...(Array.isArray(value) ? value : [])];
                          arr[idx] = { ...arr[idx], [sub.key]: e.target.value };
                          onChange(arr);
                        }}
                        rows={2}
                        className={inputCls}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(item?.[sub.key] ?? '')}
                        onChange={(e) => {
                          const arr = [...(Array.isArray(value) ? value : [])];
                          arr[idx] = { ...arr[idx], [sub.key]: e.target.value };
                          onChange(arr);
                        }}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
            <button
              onClick={() => {
                const arr = [...(Array.isArray(value) ? value : [])];
                const def: Record<string, unknown> = {};
                for (const sub of field.item ?? []) def[sub.key] = '';
                arr.push(def);
                onChange(arr);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <Plus size={14} /> Tambah {field.itemLabel ?? 'item'}
            </button>
          </div>
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={inputCls}
          />
        </div>
      );
  }
}

/** Tombol hapus kecil (dipakai dalam kanvas blok). */
export function BlockRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500"
      aria-label="Hapus blok"
    >
      <Trash2 size={16} />
    </button>
  );
}
