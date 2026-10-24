'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ProductAttribute } from '@/graphql/query/webstore';

type Props = {
  /** Semua atribut produk (baris name+value, bisa berulang per name). */
  attributes: ProductAttribute[];
  /** Kirim { summary, variant_key } varian terpilih. */
  onChange?: (selection: { summary: string; variant_key: string }) => void;
};

/**
 * UI pilihan varian per attribute name (radio per value unik).
 * Kelompokkan attributes by `name`; opsi = daftar `value` unik per name.
 * Nilai pertama tiap grup jadi default; perubahan langsung dilaporkan via onChange.
 */
export function VariantPicker({ attributes, onChange }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of attributes ?? []) {
      if (!a?.name || !a?.value) continue;
      const list = map.get(a.name) ?? [];
      if (!list.includes(a.value)) list.push(a.value);
      map.set(a.name, list);
    }
    return Array.from(map.entries());
  }, [attributes]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of attributes ?? []) {
      if (!a?.name || !a?.value) continue;
      if (!(a.name in init)) init[a.name] = a.value;
    }
    return init;
  });

  const summary = useMemo(
    () => groups.map(([name]) => `${name} ${selected[name] ?? ''}`.trim()).join(', '),
    [groups, selected],
  );

  const variantKey = useMemo(
    () => groups.map(([name, _values]) => `${name}:${selected[name] ?? ''}`).join('|'),
    [groups, selected],
  );

  useEffect(() => {
    onChange?.({ summary, variant_key: variantKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(name: string, value: string) {
    const next = { ...selected, [name]: value };
    setSelected(next);
    onChange?.({
      summary: groups.map(([n]) => `${n} ${next[n] ?? ''}`.trim()).join(', '),
      variant_key: groups.map(([n]) => `${n}:${next[n] ?? ''}`).join('|'),
    });
  }

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map(([name, values]) => (
        <div key={name}>
          <div className="mb-2 text-sm font-bold text-slate-800">{name}</div>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const active = (selected[name] ?? values[0]) === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => pick(name, value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                  style={active ? { background: 'var(--brand)' } : undefined}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-bold">Varian:</span> {summary}
      </div>
    </div>
  );
}
