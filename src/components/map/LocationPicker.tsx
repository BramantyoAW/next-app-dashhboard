'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, CircleMarker, Circle, Marker } from 'leaflet';
// CSS Leaflet diimpor di sini, bukan di layout: hanya komponen ini yang butuh,
// dan Next.js menyertakannya saat komponen ini benar-benar dirender.
import 'leaflet/dist/leaflet.css';

/**
 * Pemilih titik alamat di peta (pin point).
 *
 * Dipakai di checkout untuk menentukan koordinat pembeli. Koordinat inilah yang
 * membuat ongkir instant delivery bisa dihitung per-km; tanpa pin, semua jarak
 * dianggap 0 dan tarif per-km selalu jatuh ke biaya minimal.
 *
 * Leaflet dipakai langsung (tanpa react-leaflet) karena pustaka itu cukup
 * dipanggil dari satu tempat saja — menghindari satu dependensi tambahan.
 *
 * Catatan ornamen: penanda dibatasi pada `circleMarker` bawaan, bukan ikon
 * gambar. Ikon default Leaflet memuat berkas PNG lewat jalur relatif yang rusak
 * setelah dibundel Next.js, dan gejalanya (pin tidak muncul / 404) baru terlihat
 * di produksi.
 */

export type Outlet = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  radius_km?: number | null;
  is_open?: boolean | null;
};

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (next: { lat: number; lng: number }) => void;
  /** Outlet merchant — dipakai sebagai pusat peta awal & gambar jangkauan. */
  outlets?: Outlet[];
  disabled?: boolean;
};

/** Pusat Indonesia — cadangan bila merchant belum memetakan outletnya. */
const PUSAT_DEFAULT: [number, number] = [-2.5, 118];

/**
 * Rapikan koordinat hasil klik peta.
 *
 * Saat peta di-zoom-out jauh, Leaflet membolehkan klik di luar batas dunia dan
 * menghasilkan nilai seperti longitude -427. Backend menolak koordinat di luar
 * rentang (dan memang harus begitu), tapi kalau nilai mentah diteruskan, pin
 * yang dilihat pembeli tidak sama dengan yang dihitung server: pin tampak
 * terpasang, sementara ongkir memakai "jarak tidak diketahui".
 *
 * Longitude dibungkus ke rentang -180..180 dan latitude dijepit, sehingga
 * koordinat yang dikirim selalu bisa dipakai menghitung jarak.
 */
function rapikanKoordinat(lat: number, lng: number): { lat: number; lng: number } {
  const lngNormal = ((((lng + 180) % 360) + 360) % 360) - 180;
  const latNormal = Math.max(-90, Math.min(90, lat));

  return { lat: latNormal, lng: lngNormal };
}

export function LocationPicker({ value, onChange, outlets = [], disabled = false }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<CircleMarker | Marker | null>(null);
  const lingkaranRef = useRef<(Circle | CircleMarker)[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Outlet berkoordinat → pusat peta & lingkaran jangkauan.
  const outletBerKoordinat = outlets.filter(
    (o) => typeof o.lat === 'number' && typeof o.lng === 'number',
  );

  // Outlet biasanya baru tersedia setelah query webstore selesai, yaitu SESUDAH
  // peta dibuat. Tanpa penanda ini, peta sudah terlanjur dipusatkan ke titik
  // cadangan dan tidak pernah dipindahkan ke outlet sebenarnya — pembeli melihat
  // peta Indonesia dan mengira outletnya jauh.
  const sigOutlet = outletBerKoordinat.map((o) => `${o.id}:${o.lat}:${o.lng}`).join('|');
  const sudahDipusatkan = useRef(false);
  // Peta dibangun lewat import dinamis (async), jadi effect lain bisa berjalan
  // sebelum peta ada. State ini memicu ulang penggambaran outlet setelah peta
  // benar-benar siap.
  const [petaSiap, setPetaSiap] = useState(false);

  useEffect(() => {
    let dibuang = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (dibuang || !hostRef.current || mapRef.current) return;

      const pusat: [number, number] = value
        ? [value.lat, value.lng]
        : outletBerKoordinat.length > 0
          ? [outletBerKoordinat[0].lat as number, outletBerKoordinat[0].lng as number]
          : PUSAT_DEFAULT;

      const map = L.map(hostRef.current, { scrollWheelZoom: true }).setView(pusat, value ? 15 : 12);
      mapRef.current = map;
      sudahDipusatkan.current = value !== null || outletBerKoordinat.length > 0;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      if (value) {
        pinRef.current = L.circleMarker([value.lat, value.lng], {
          radius: 8,
          color: '#ffffff',
          weight: 3,
          fillColor: '#e11d48',
          fillOpacity: 1,
        }).addTo(map);
      }

      map.on('click', (e) => {
        const bersih = rapikanKoordinat(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(bersih);
      });

      setPetaSiap(true);

      // Satu kali ukur ulang: peta di dalam kontainer yang baru dirender
      // kadang menghitung lebar 0 dan tampil abu-abu sampai di-resize.
      setTimeout(() => map.invalidateSize(), 0);
    })();

    return () => {
      dibuang = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
    // Sengaja hanya sekali: peta tidak dibangun ulang tiap pin berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gambar outlet + jangkauannya. Dipisah dari pembuatan peta karena data
  // outlet sering baru tersedia setelah peta berdiri.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let batal = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (batal) return;

      for (const layer of lingkaranRef.current) map.removeLayer(layer);
      lingkaranRef.current = [];

      for (const o of outletBerKoordinat) {
        const lat = o.lat as number;
        const lng = o.lng as number;

        lingkaranRef.current.push(
          L.circle([lat, lng], {
            radius: (o.radius_km ?? 0) * 1000,
            color: o.is_open === false ? '#94a3b8' : '#0f766e',
            weight: 1,
            fillOpacity: 0.08,
          }).addTo(map),
        );

        lingkaranRef.current.push(
          L.circleMarker([lat, lng], {
            radius: 6,
            color: '#ffffff',
            weight: 2,
            fillColor: o.is_open === false ? '#94a3b8' : '#0f766e',
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(o.name, { direction: 'top' }),
        );

        // Pindahkan pandangan ke outlet begitu koordinatnya diketahui — tapi
        // jangan ganggu pembeli yang sudah menaruh pin sendiri.
        if (!sudahDipusatkan.current && !value) {
          map.setView([lat, lng], 13);
          sudahDipusatkan.current = true;
        }
      }
    })();

    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigOutlet, petaSiap]);

  // Pin mengikuti nilai dari luar (mis. hasil "Lokasi saya" atau alamat tersimpan).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let batal = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (batal) return;

      if (pinRef.current) {
        map.removeLayer(pinRef.current);
        pinRef.current = null;
      }
      if (!value) return;

      pinRef.current = L.circleMarker([value.lat, value.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#e11d48',
        fillOpacity: 1,
      }).addTo(map);
    })();

    return () => {
      batal = true;
    };
  }, [value, petaSiap]);

  function pakaiLokasiSaya() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = rapikanKoordinat(pos.coords.latitude, pos.coords.longitude);
        onChange(next);
        mapRef.current?.setView([next.lat, next.lng], 16);
      },
      () => {
        /* Ditolak/tidak tersedia → pembeli bisa menaruh pin manual. */
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">
          Titik lokasi di peta
          {value ? (
            <span className="ml-1 font-normal text-slate-400">
              ({value.lat.toFixed(5)}, {value.lng.toFixed(5)})
            </span>
          ) : (
            <span className="ml-1 font-normal text-amber-600">— belum ditentukan</span>
          )}
        </span>
        <button
          type="button"
          onClick={pakaiLokasiSaya}
          disabled={disabled}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Gunakan lokasi saya
        </button>
      </div>
      <div
        ref={hostRef}
        className={`h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
          disabled ? 'pointer-events-none opacity-60' : ''
        }`}
      />
      <p className="mt-1.5 text-[11px] text-slate-400">
        Ketuk peta untuk menaruh pin. Titik ini dipakai menghitung jarak &amp; ongkir kirim instan.
      </p>
    </div>
  );
}
