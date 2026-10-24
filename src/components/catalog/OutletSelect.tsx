'use client';

import React from 'react';

type OutletOption = { id: number | string; name: string };

/**
 * Select pemilihan outlet untuk EDIT STOK.
 * Dipakai di edit product: user memilih eksplisit outlet tujuan edit stok,
 * terpisah dari checkbox Merchant/Outlet (yang hanya toggle aktif/nonaktif).
 */
export function OutletSelect({
  outlets,
  value,
  onChange,
  label = 'Pilih Outlet untuk Edit Stok',
  compact = false,
}: {
  outlets: OutletOption[];
  value: number | string | null;
  onChange: (id: number | null) => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? '' : 'mb-4'}>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value != null ? String(value) : ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">— Pilih Outlet —</option>
        {outlets.map(o => (
          <option key={String(o.id)} value={String(o.id)}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
