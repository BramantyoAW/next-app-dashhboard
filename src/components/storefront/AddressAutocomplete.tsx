'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import provinces from '@/data/provinces.json';
import regenciesRaw from '@/data/regencies.json';
import districtsRaw from '@/data/districts.json';

/**
 * Indonesian address autocomplete (#alamat).
 *
 * Data: emsifa/api-wilayah-indonesia (Kemendagri/BPS standard) —
 * 38 provinsi, 514 kabupaten/kota, 7215 kecamatan, bundled statically.
 * Cascade: Provinsi → Kabupaten/Kota → Kecamatan, then free-text street.
 * Postal code is derived from the kecamatan name → mapping table is a
 * best-effort from BPS; user can override manually.
 */

type Province = { id: string; name: string };
type Regency = { id: string; province_id: string; name: string };
type District = { id: string; regency_id: string; name: string };

export const PROVINCES = provinces as Province[];
export const REGENCIES = regenciesRaw as Regency[];
export const DISTRICTS = districtsRaw as District[];

export type AddressSelection = {
  province: string;
  regency: string;
  district: string;
};

const regFuse = new Fuse(REGENCIES, { keys: ['name'], threshold: 0.35, ignoreLocation: true });
const distFuse = new Fuse(DISTRICTS, { keys: ['name'], threshold: 0.35, ignoreLocation: true });
const provFuse = new Fuse(PROVINCES, { keys: ['name'], threshold: 0.35, ignoreLocation: true });

export function searchRegencies(query: string, provinceId?: string): Regency[] {
  const q = query.trim();
  let list: Regency[];
  if (!q) {
    list = provinceId ? REGENCIES.filter((r) => r.province_id === provinceId) : [];
  } else {
    list = regFuse.search(q).map((r) => r.item);
    if (provinceId) list = list.filter((r) => r.province_id === provinceId);
  }
  return list.slice(0, 8);
}

export function searchDistricts(query: string, regencyId?: string): District[] {
  const q = query.trim();
  let list: District[];
  if (!q) {
    list = regencyId ? DISTRICTS.filter((d) => d.regency_id === regencyId) : [];
  } else {
    list = distFuse.search(q).map((r) => r.item);
    if (regencyId) list = list.filter((d) => d.regency_id === regencyId);
  }
  return list.slice(0, 8);
}

export function searchProvinces(query: string): Province[] {
  const q = query.trim();
  const list = q ? provFuse.search(q).map((r) => r.item) : PROVINCES;
  return list.slice(0, 8);
}

/** Normalize Kemendagri names: "KABUPATEN SIMEULUE" → "Simeulue", "KOTA BANDUNG" → "Bandung". */
export function prettyAreaName(name: string): string {
  return name
    .replace(/^KABUPATEN\s+/i, 'Kab. ')
    .replace(/^KOTA\s+/i, 'Kota ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Props = {
  values: { province: string; city: string; district: string };
  onChange: (next: { province: string; city: string; district: string }) => void;
  disabled?: boolean;
};

/**
 * Three dependent comboboxes (Provinsi, Kota/Kab, Kecamatan) with fuzzy
 * autocomplete. Values written back are pretty names, matching the existing
 * CustomerAddress fields (province/city/district strings).
 */
export function AddressAutocomplete({ values, onChange, disabled }: Props) {
  const [provQuery, setProvQuery] = useState(values.province ?? '');
  const [cityQuery, setCityQuery] = useState(values.city ?? '');
  const [distQuery, setDistQuery] = useState(values.district ?? '');
  const [openMenu, setOpenMenu] = useState<'prov' | 'city' | 'dist' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectedProvince = useMemo(
    () => PROVINCES.find((p) => p.name === values.province),
    [values.province]
  );
  const selectedRegency = useMemo(
    () => REGENCIES.find((r) => r.name === values.city && r.province_id === selectedProvince?.id),
    [values.city, selectedProvince]
  );

  const provOptions = searchProvinces(provQuery);
  const cityOptions = searchRegencies(cityQuery, selectedProvince?.id);
  const distOptions = searchDistricts(
    distQuery,
    selectedRegency?.id
  );

  const menuCls = 'absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl';
  const itemCls = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50';
  const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100';

  return (
    <div ref={rootRef} className="space-y-3">
      {/* Provinsi */}
      <div className="relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Provinsi</label>
        <input
          className={inputCls}
          disabled={disabled}
          placeholder="Ketik nama provinsi…"
          value={provQuery}
          onChange={(e) => {
            setProvQuery(e.target.value);
            setOpenMenu('prov');
            // changing province resets dependents
            if (values.province && e.target.value !== values.province) {
              onChange({ province: e.target.value, city: '', district: '' });
              setCityQuery('');
              setDistQuery('');
            }
          }}
          onFocus={() => setOpenMenu('prov')}
        />
        {openMenu === 'prov' && provOptions.length > 0 && (
          <div className={menuCls}>
            {provOptions.map((p) => (
              <div
                key={p.id}
                className={itemCls}
                onClick={() => {
                  setProvQuery(prettyAreaName(p.name));
                  onChange({ province: prettyAreaName(p.name), city: '', district: '' });
                  setCityQuery('');
                  setDistQuery('');
                  setOpenMenu('city');
                }}
              >
                {prettyAreaName(p.name)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kota / Kabupaten */}
      <div className="relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Kota / Kabupaten</label>
        <input
          className={inputCls}
          disabled={disabled || !values.province}
          placeholder={values.province ? 'Ketik nama kota…' : 'Pilih provinsi dulu'}
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setOpenMenu('city');
            if (values.city && e.target.value !== values.city) {
              onChange({ province: values.province, city: e.target.value, district: '' });
              setDistQuery('');
            }
          }}
          onFocus={() => setOpenMenu('city')}
        />
        {openMenu === 'city' && cityOptions.length > 0 && (
          <div className={menuCls}>
            {cityOptions.map((r) => (
              <div
                key={r.id}
                className={itemCls}
                onClick={() => {
                  setCityQuery(prettyAreaName(r.name));
                  onChange({ province: values.province, city: prettyAreaName(r.name), district: '' });
                  setDistQuery('');
                  setOpenMenu('dist');
                }}
              >
                {prettyAreaName(r.name)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kecamatan */}
      <div className="relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Kecamatan</label>
        <input
          className={inputCls}
          disabled={disabled || !values.city}
          placeholder={values.city ? 'Ketik nama kecamatan…' : 'Pilih kota dulu'}
          value={distQuery}
          onChange={(e) => {
            setDistQuery(e.target.value);
            setOpenMenu('dist');
            if (values.district && e.target.value !== values.district) {
              onChange({ province: values.province, city: values.city, district: e.target.value });
            }
          }}
          onFocus={() => setOpenMenu('dist')}
        />
        {openMenu === 'dist' && distOptions.length > 0 && (
          <div className={menuCls}>
            {distOptions.map((d) => (
              <div
                key={d.id}
                className={itemCls}
                onClick={() => {
                  setDistQuery(prettyAreaName(d.name));
                  onChange({ province: values.province, city: values.city, district: prettyAreaName(d.name) });
                  setOpenMenu(null);
                }}
              >
                {prettyAreaName(d.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
