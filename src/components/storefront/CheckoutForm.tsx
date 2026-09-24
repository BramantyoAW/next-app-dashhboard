'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';
import {
  SEARCH_DESTINATIONS,
  shippingMethodKind,
  type Destination,
  type ShippingMethod,
  type ShippingOption,
} from '@/graphql/query/webstore';
import {
  loadCart,
  cartTotal,
  clearCart,
  formatIDR,
  type CartItem,
} from '@/lib/cart';
import { estimateShipping, type ShippingEstimate } from '@/graphql/query/webstore';
import { CouponInput, type CouponAppliedInfo } from '@/components/storefront/CouponInput';
import { getCustomerToken } from '@/lib/customer-token';
import { StorefrontImage } from '@/components/storefront/ui/StorefrontImage';
import { AddressAutocomplete } from '@/components/storefront/AddressAutocomplete';
import { LocationPicker } from '@/components/map/LocationPicker';

export type PaymentMethod = {
  id: string;
  type: string;
  name: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  instructions?: string | null;
  is_free: boolean;
  enabled: boolean;
};

export type PickupOutlet = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_open: boolean | null;
  // Koordinat & jangkauan outlet, dipakai peta checkout. Null berarti merchant
  // belum memetakan outlet ini — bukan berarti berada di titik (0,0).
  lat?: number | null;
  lng?: number | null;
  radius_km?: number | null;
};

export type SavedAddress = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  address_line: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  lat?: number | null;
  lng?: number | null;
  is_default: boolean;
  /**
   * Kecamatan tujuan ekspedisi. Dipisah dari lat/lng karena kurir instan
   * memakai koordinat sementara ekspedisi hanya menerima ID kecamatan —
   * alamat bisa punya salah satu, atau keduanya.
   */
  destination_id?: number | null;
  destination_label?: string | null;
};

/**
 * Pesan untuk tiap alasan pengiriman tidak tersedia.
 *
 * Dikumpulkan di satu tempat supaya banner di ringkasan dan pesan saat menekan
 * "Buat Pesanan" tidak pernah berbeda. Backend sengaja mengirim alasan yang
 * bisa dibedakan (bukan sekadar available=false) justru agar pembeli mendapat
 * langkah berikutnya yang tepat, bukan pesan umum yang tidak menolong.
 */
function pesanTidakTersedia(s: { reason?: string | null; distance_km?: number }): string {
  switch (s.reason) {
    case 'toko_tutup':
      return 'Toko sedang tutup untuk pengiriman. Pilih ambil di outlet atau coba lagi nanti.';
    case 'tujuan_belum_dipilih':
      return 'Pilih dulu kecamatan tujuan pengiriman supaya ongkir ekspedisi bisa dihitung.';
    case 'ekspedisi_tidak_tersedia':
      return 'Layanan ekspedisi belum tersedia untuk alamat ini. Kamu masih bisa memilih ambil di outlet.';
    default:
      return `Alamat ini di luar jangkauan pengiriman toko (${s.distance_km?.toFixed(1) ?? '?'} km). `
        + 'Pilih ambil di outlet, atau geser pin ke lokasi yang lebih dekat.';
  }
}

export function CheckoutForm({ hash }: { hash: string }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState('');
  const [saveAddr, setSaveAddr] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPm, setSelectedPm] = useState('');
  const [shipping, setShipping] = useState<ShippingEstimate | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [coupon, setCoupon] = useState<CouponAppliedInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<{ orderId: string; instructions: string } | null>(null);
  // Pickup in store (Opsi A): satu outlet pilihan customer, ongkir Rp 0.
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupOutlets, setPickupOutlets] = useState<PickupOutlet[]>([]);
  const [pickupStoreId, setPickupStoreId] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  // Titik peta alamat kirim. Null = pembeli belum menaruh pin; backend
  // memperlakukannya sebagai jarak 0 sehingga tarif per-km jatuh ke biaya
  // minimal, jadi pin ini yang membuat ongkir jarak menjadi akurat.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Titik tetap dipakai saat mengirim, tanpa memicu ulang effect estimasi.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  // ── Ekspedisi: kecamatan tujuan + layanan kurir pilihan pembeli ──
  // RajaOngkir hanya menerima ID kecamatan untuk tarif ekspedisi, jadi alamat
  // saja tidak cukup. Koordinat di atas tetap dipakai kurir instan.
  const [destination, setDestination] = useState<{ id: number; label: string } | null>(null);
  const [kecamatanKata, setKecamatanKata] = useState('');
  const [kecamatanHasil, setKecamatanHasil] = useState<Destination[]>([]);
  const [kecamatanCari, setKecamatanCari] = useState(false);
  const [kecamatanPesan, setKecamatanPesan] = useState<string | null>(null);
  // Layanan kurir yang dipilih pembeli dari daftar opsi. Kosong = termurah,
  // yang juga menjaga perilaku toko non-ekspedisi tetap seperti semula.
  const [opsiId, setOpsiId] = useState<string>('');
  // Jenis metode ongkir yang aktif di toko ini, untuk memutuskan apakah
  // pencarian kecamatan perlu ditampilkan sama sekali.
  const [adaEkspedisi, setAdaEkspedisi] = useState(false);

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace(`/storefront/${hash}/sign-in?next=/storefront/${hash}/checkout`);
      return;
    }
    setItems(loadCart(hash));
    gqlFetch<{ customerMe: { addresses: SavedAddress[] } | null }>(
      `query { customerMe { addresses { id label recipient phone address_line city province postal_code lat lng destination_id destination_label is_default } } }`,
      {},
      getCustomerToken() ?? undefined,
    )
      .then((d) => {
        const list = d?.customerMe?.addresses ?? [];
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) {
          setSelectedAddrId(def.id);
          applyAddress(def);
        }
      })
      .catch(() => {});
    gqlFetch<{
      webStoreBySlug: {
        payment_methods: PaymentMethod[];
        pickup_outlets: PickupOutlet[];
        shipping_methods: ShippingMethod[];
      } | null;
    }>(
      `query($slug: String!) {
        webStoreBySlug(slug: $slug) {
          payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
          pickup_outlets { id name address phone is_open lat lng radius_km }
          shipping_methods { id name type enabled }
        }
      }`,
      { slug: hash },
    )
      .then((d) => {
        const list = (d?.webStoreBySlug?.payment_methods ?? []).filter((m) => m.enabled);
        setPaymentMethods(list);
        setSelectedPm(list[0]?.id ?? '');
        setPickupOutlets(d?.webStoreBySlug?.pickup_outlets ?? []);
        // Pencarian kecamatan hanya relevan bila toko memang punya metode
        // ekspedisi; untuk toko yang hanya kirim instan, kolom itu cuma
        // menambah langkah yang tidak perlu bagi pembeli.
        setAdaEkspedisi(
          (d?.webStoreBySlug?.shipping_methods ?? []).some(
            (m) => String(m.type ?? '').toLowerCase() === 'expedition',
          ),
        );
      })
      .catch(() => {});
  }, [hash, router]);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    setShippingLoading(true);

    // Ditunda 500 ms: pin bisa digeser berkali-kali, dan tiap perubahan memicu
    // satu permintaan ongkir. Tanpa penundaan, satu kali geser pin menghasilkan
    // beberapa permintaan sekaligus dan angka ongkir berkedip.
    const timer = setTimeout(() => {
      estimateShipping({
        web_store_slug: hash,
        items: items.map((i) => ({ store_product_id: i.store_product_id, qty: i.qty })),
        subtotal: cartTotal(items),
        // Koordinat dikirim agar tarif per-km dan jangkauan bisa dihitung.
        // Tanpa ini backend menganggap jarak 0 → tarif selalu biaya minimal.
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        // ID kecamatan untuk ekspedisi. Dikirim terpisah dari koordinat karena
        // keduanya dipakai jalur pengiriman yang berbeda.
        ...(destination ? { destination_id: destination.id } : {}),
      })
        .then((d) => {
          if (cancelled) return;
          const est = d?.estimateShipping ?? null;
          setShipping(est);
          // Pilihan kurir direset HANYA bila id-nya tidak ada lagi di daftar
          // baru. Tanpa ini, tarif berubah (pembeli menambah barang) sementara
          // pilihan lama tetap terkirim dan checkout ditolak server.
          setOpsiId((sebelum) => {
            const daftar = est?.options ?? [];
            if (sebelum && daftar.some((o) => o.id === sebelum)) return sebelum;
            return daftar[0]?.id ?? '';
          });
        })
        .catch(() => {
          if (!cancelled) setShipping(null);
        })
        .finally(() => {
          if (!cancelled) setShippingLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hash, items, coords, destination]);

  /**
   * Pencarian kecamatan tujuan ekspedisi.
   *
   * Ditunda 400 ms dan minimal 3 huruf: setiap ketikan memicu satu permintaan
   * ke RajaOngkir, dan kuota tarif itu berbayar. Backend juga menolak kata
   * kunci di bawah 3 huruf, jadi menahan di sini menghemat perjalanan bolak-
   * balik yang pasti tidak berhasil.
   */
  useEffect(() => {
    if (!adaEkspedisi) return;
    const kata = kecamatanKata.trim();
    if (kata.length < 3) {
      setKecamatanHasil([]);
      setKecamatanPesan(null);
      return;
    }

    let cancelled = false;
    setKecamatanCari(true);
    const timer = setTimeout(() => {
      gqlFetch<{ searchDestinations: Destination[] }>(SEARCH_DESTINATIONS, { keyword: kata, limit: 8 })
        .then((d) => {
          if (cancelled) return;
          const hasil = d?.searchDestinations ?? [];
          setKecamatanHasil(hasil);
          // Daftar kosong bisa berarti tidak ada yang cocok ATAU pencarian
          // sedang tidak tersedia (API key kurir belum dipasang). Pesannya
          // sengaja netral: pembeli tidak perlu tahu soal API key.
          setKecamatanPesan(hasil.length === 0 ? 'Kecamatan tidak ditemukan. Coba kata kunci lain.' : null);
        })
        .catch(() => {
          if (!cancelled) {
            setKecamatanHasil([]);
            setKecamatanPesan('Pencarian kecamatan sedang tidak tersedia.');
          }
        })
        .finally(() => {
          if (!cancelled) setKecamatanCari(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kecamatanKata, adaEkspedisi]);

  if (placed) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Pesanan berhasil dibuat!</h2>
        <p className="mt-1 text-sm text-slate-500">Selesaikan pembayaran untuk memproses pesanan Anda.</p>
        <pre className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-xs whitespace-pre-wrap text-slate-700">{placed.instructions}</pre>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <Link href={`/storefront/${hash}/thankyou/${placed.orderId}`} className="rounded-full bg-slate-900 px-5 py-2 font-bold text-white">
            Lihat Pesanan
          </Link>
          <Link href={`/storefront/${hash}/account`} className="rounded-full border border-slate-300 px-5 py-2 font-semibold text-slate-600 hover:bg-slate-50">
            Akun Saya
          </Link>
          <Link href={`/storefront/${hash}`} className="rounded-full border border-slate-300 px-5 py-2 font-semibold text-slate-600 hover:bg-slate-50">
            Kembali Belanja
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
        Keranjang kosong.
        <div className="mt-3">
          <Link href={`/storefront/${hash}`} className="font-bold underline">
            Kembali belanja
          </Link>
        </div>
      </div>
    );
  }

  const total = cartTotal(items);
  const pickup = fulfillmentType === 'pickup';

  // Layanan yang bisa dipilih pembeli. Toko non-ekspedisi hanya punya satu
  // opsi (atau tidak ada), jadi daftar pemilihnya tidak perlu tampil.
  const opsiTampil: ShippingOption[] = shipping?.options ?? [];
  const opsiTerpilih =
    opsiTampil.find((o) => o.id === opsiId) ?? (opsiTampil.length === 1 ? opsiTampil[0] : null);
  // Harga yang benar-benar ditagih: pilihan pembeli bila ada, kalau tidak
  // angka termurah dari server. Selalu dari server, tidak pernah dari layar,
  // supaya angka yang ditampilkan tidak bisa berbeda dari yang ditagih.
  const ongkir = pickup ? 0 : (opsiTerpilih?.cost ?? shipping?.cost ?? 0);
  // Jarak hanya relevan untuk metode yang memang menghitungnya. Tarif flat dan
  // ekspedisi tidak memakai jarak, jadi menampilkan "12.3 km" di sana
  // menyesatkan pembeli soal apa yang mereka bayar.
  const ongkirJarak =
    !pickup && opsiTerpilih && shippingMethodKind(opsiTerpilih.method) === 'distance'
      ? shipping?.distance_km ?? 0
      : 0;
  // Berat ditampilkan hanya bila ada layanan ekspedisi yang dipilih.
  const ongkirBerat = !pickup && opsiTerpilih?.courier_code ? shipping?.weight_gram ?? null : null;

  // Outlet yang sudah dipetakan merchant. Dikirim ke peta sebagai pusat awal
  // dan untuk menggambar lingkaran jangkauan.
  const outletBerKoordinat = pickupOutlets.filter(
    (o) => typeof o.lat === 'number' && typeof o.lng === 'number',
  );

  function applyAddress(a: SavedAddress) {
    setRecipient(a.recipient);
    setPhone(a.phone);
    setAddress(a.address_line);
    setCity(a.city ?? '');
    setProvince(a.province ?? '');
    setPostalCode(a.postal_code ?? '');
    // Alamat yang sudah punya titik peta langsung dipakai; kalau belum, pin
    // dibiarkan kosong agar pembeli tidak dikirimi koordinat alamat lain.
    if (typeof a.lat === 'number' && typeof a.lng === 'number') {
      setCoords({ lat: a.lat, lng: a.lng });
    } else {
      setCoords(null);
    }
    // Kecamatan tersimpan dipakai ulang supaya pembeli yang sering berbelanja
    // tidak perlu mencari kecamatannya setiap kali checkout.
    if (a.destination_id && a.destination_label) {
      setDestination({ id: a.destination_id, label: a.destination_label });
      setKecamatanKata('');
    } else {
      setDestination(null);
    }
  }

  async function selectAddress(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (a) {
      setSelectedAddrId(id);
      applyAddress(a);
    }
  }

  async function saveAddressNow() {
    if (!recipient || !phone || !address) return;
    await gqlFetch<{ upsertCustomerAddress: SavedAddress }>(
      `mutation($i: CustomerAddressInput!) {
        upsertCustomerAddress(input: $i) { id label recipient phone address_line city province postal_code lat lng destination_id destination_label is_default }
      }`,
      {
        i: {
          label: 'Alamat Checkout',
          recipient,
          phone,
          address_line: address,
          city: city || null,
          province: province || null,
          postal_code: postalCode || null,
          // Pin hanya dikirim kalau ada; kalau tidak, titik lama di alamat ini
          // dipertahankan (backend tidak menimpa bila field-nya tidak ada).
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          // Kecamatan tujuan ekspedisi, bila pembeli sudah memilihnya.
          ...(destination
            ? { destination_id: destination.id, destination_label: destination.label }
            : {}),
          is_default: true,
        },
      },
      getCustomerToken() ?? undefined,
    ).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (fulfillmentType === 'pickup') {
      if (!pickupStoreId) {
        setErr('Pilih outlet pengambilan');
        return;
      }
      if (!recipient || !phone) {
        setErr('Nama dan nomor HP wajib diisi');
        return;
      }
    } else if (!recipient || !phone || !address) {
      setErr('Nama, telepon, dan alamat wajib diisi');
      return;
    }
    // Pengiriman yang tidak tersedia dihentikan di sini supaya pembeli tidak
    // menunggu sampai backend menolak. Backend tetap memeriksa ulang — ini
    // hanya agar pesannya lebih cepat dan lebih jelas.
    if (fulfillmentType === 'delivery' && shipping && !shipping.available) {
      setErr(pesanTidakTersedia(shipping));
      return;
    }
    if (!selectedPm) {
      setErr('Pilih metode pembayaran');
      return;
    }
    setBusy(true);
    try {
      if (fulfillmentType === 'delivery' && saveAddr) await saveAddressNow();
      const data = await gqlFetch<{ placeWebOrder: { order: { id: string }; payment_instructions: string | null } }>(
        `mutation($i: PlaceWebOrderInput!) {
          placeWebOrder(input: $i) { order { id } payment_instructions }
        }`,
        {
          i: {
            web_store_slug: hash,
            items: items.map((i) => ({
              store_product_id: i.store_product_id,
              qty: i.qty,
              ...(i.variant_key ? { variant_key: i.variant_key } : {}),
            })),
            fulfillment_type: fulfillmentType,
            ...(fulfillmentType === 'pickup'
              ? {
                  pickup_store_id: pickupStoreId,
                  pickup_note: pickupNote || null,
                  // contact person tetap dikirim untuk konfirmasi
                  shipping_address: { recipient, phone, address_line: null, city: null, province: null, postal_code: null },
                }
              : {
                  shipping_address: {
                    recipient,
                    phone,
                    // Kecamatan dari autocomplete digabung ke baris alamat
                    // (kolom district belum ada di tabel customer_addresses).
                    address_line: district ? `${address}, Kec. ${district}` : address,
                    city: city || null,
                    province: province || null,
                    postal_code: postalCode || null,
                  },
                }),
            payment_method: selectedPm,
            // Koordinat pesanan. Backend memakainya untuk menghitung ongkir dan
            // MEMERIKSA JANGKAUAN — nilai ini bisa ditolak walau FE sudah
            // menampilkan estimasi, jadi jangan dianggap sekadar pelengkap.
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
            // Kecamatan tujuan: dipakai backend untuk tarif ekspedisi, dan
            // diperiksa ulang di sana — bukan sekadar pelengkap tampilan.
            ...(fulfillmentType === 'delivery' && destination
              ? { destination_id: destination.id }
              : {}),
            // Layanan yang dipilih pembeli. Backend mencocokkannya dengan
            // daftar tarif yang BARU dihitung dan menolak id yang tidak dikenal,
            // jadi harga tidak pernah diambil dari sini.
            ...(fulfillmentType === 'delivery' && opsiId ? { shipping_option_id: opsiId } : {}),
            ...(coupon?.code ? { coupon_code: coupon.code } : {}),
          },
        },
        getCustomerToken() ?? undefined,
      );
      clearCart(hash);
      setPlaced({
        orderId: data.placeWebOrder.order.id,
        instructions: data.placeWebOrder.payment_instructions ?? 'Pesanan diterima. Silakan konfirmasi pembayaran.',
      });
    } catch (e: any) {
      setErr(e?.message ?? 'Checkout gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold tracking-tight text-slate-900">Pengambilan</h2>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFulfillmentType('delivery')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                fulfillmentType === 'delivery' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Dikirim
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType('pickup')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                fulfillmentType === 'pickup' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Ambil di Outlet
            </button>
          </div>

          {fulfillmentType === 'pickup' ? (
            <div className="space-y-3">
              {pickupOutlets.length === 0 ? (
                <p className="text-sm text-slate-400">Toko belum memiliki outlet untuk pengambilan.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {pickupOutlets.map((o) => (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition ${
                          pickupStoreId === o.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pickup"
                          value={o.id}
                          checked={pickupStoreId === o.id}
                          onChange={() => setPickupStoreId(o.id)}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          <span className="block font-bold text-slate-800">{o.name}</span>
                          {o.address && <span className="mt-0.5 block text-xs text-slate-500">{o.address}</span>}
                          {o.phone && <span className="mt-0.5 block text-xs text-slate-400">{o.phone}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
                    placeholder="Catatan untuk outlet (opsional) — mis. jam kedatangan"
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Tanpa ongkir — pesanan disiapkan di outlet pilihanmu.</p>
                </>
              )}
            </div>
          ) : (
            <>
          {addresses.length > 0 && (
            <select
              className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
              value={selectedAddrId}
              onChange={(e) => selectAddress(e.target.value)}
            >
              <option value="">— Pilih alamat tersimpan —</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label ?? 'Alamat'} — {a.address_line}, {a.city ?? ''}
                </option>
              ))}
            </select>
          )}
          <input className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2" style={{ ['--tw-ring-color' as never]: 'var(--brand)' }} placeholder="Nama penerima" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          <input className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2" style={{ ['--tw-ring-color' as never]: 'var(--brand)' }} placeholder="No. HP" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <textarea className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2" style={{ ['--tw-ring-color' as never]: 'var(--brand)' }} placeholder="Alamat lengkap (jalan, nomor, RT/RW)" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <AddressAutocomplete
            values={{ province, city, district }}
            onChange={(next) => {
              setProvince(next.province);
              setCity(next.city);
              setDistrict(next.district);
            }}
          />
          <input className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2" style={{ ['--tw-ring-color' as never]: 'var(--brand)' }} placeholder="Kode pos (opsional)" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />

          {/* Titik peta: tanpa pin, jarak ke outlet tidak bisa dihitung dan
              ongkir kirim instan selalu jatuh ke tarif minimal. */}
          <LocationPicker value={coords} onChange={setCoords} outlets={outletBerKoordinat} />

          {/* Kecamatan tujuan ekspedisi. Hanya muncul bila toko punya metode
              ekspedisi: kurir memakai berat + kecamatan, bukan titik peta, dan
              RajaOngkir memang hanya menerima ID kecamatan. */}
          {adaEkspedisi && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-bold tracking-wide text-slate-600 uppercase">
                Kecamatan tujuan (untuk ekspedisi)
              </p>

              {destination ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="text-sm font-semibold text-emerald-900">{destination.label}</span>
                  <button
                    type="button"
                    className="text-xs font-bold text-emerald-700 underline"
                    onClick={() => {
                      setDestination(null);
                      setKecamatanKata('');
                      setKecamatanHasil([]);
                    }}
                  >
                    Ubah
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
                    placeholder="Cari kecamatan, mis. Kemayoran"
                    value={kecamatanKata}
                    onChange={(e) => setKecamatanKata(e.target.value)}
                  />
                  {kecamatanCari && <p className="mt-2 text-xs text-slate-400">Mencari…</p>}
                  {!kecamatanCari && kecamatanPesan && (
                    <p className="mt-2 text-xs text-slate-500">{kecamatanPesan}</p>
                  )}
                  {kecamatanHasil.length > 0 && (
                    <ul className="mt-2 max-h-52 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 bg-white">
                      {kecamatanHasil.map((k) => (
                        <li key={k.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setDestination({ id: k.id, label: k.label });
                              setKecamatanHasil([]);
                              setKecamatanPesan(null);
                            }}
                          >
                            <span className="font-semibold text-slate-700">{k.label}</span>
                            {k.zip_code && <span className="ml-2 text-xs text-slate-400">{k.zip_code}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />
            Simpan alamat ini ke buku alamat saya
          </label>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold tracking-tight text-slate-900">Metode Pembayaran</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-slate-400">Metode bayar belum diatur toko.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition ${
                    selectedPm === m.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="pm" value={m.id} checked={selectedPm === m.id} onChange={() => setSelectedPm(m.id)} className="mt-1" />
                  <span className="flex-1">
                    <span className="flex items-center justify-between font-bold text-slate-800">
                      {m.name}
                      {m.is_free && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">GRATIS</span>
                      )}
                    </span>
                    {m.bank_name && <span className="mt-0.5 block text-xs text-slate-500">{m.bank_name}</span>}
                    {m.account_number && (
                      <span className="block text-xs text-slate-600">
                        No. {m.account_number}
                        {m.account_name ? ` a.n. ${m.account_name}` : ''}
                      </span>
                    )}
                    {m.instructions && <span className="mt-0.5 block text-xs text-slate-400">{m.instructions}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <CouponInput hash={hash} subtotal={total} onCouponApplied={setCoupon} />
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">Ringkasan</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          {items.map((i) => (
            <li key={`${i.store_product_id}-${i.variant_key ?? ''}`} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <StorefrontImage src={i.image} alt={i.name} className="h-full w-full object-cover" />
              </div>
              <span className="line-clamp-1 flex-1">
                {i.name} × {i.qty}
                {i.variant ? <span className="text-slate-400"> — {i.variant}</span> : null}
              </span>
              <span className="font-semibold text-slate-700">{formatIDR(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        {/* Pilihan layanan kurir. Ekspedisi mengembalikan beberapa layanan
            sekaligus (JNE Reguler, JNE YES, ...) dan pembeli yang memilih —
            masing-masing punya harga dan estimasi waktu berbeda. */}
        {!pickup && opsiTampil.length > 1 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Pilih pengiriman</p>
            <div className="space-y-1.5">
              {opsiTampil.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    opsiId === o.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping-option"
                      checked={opsiId === o.id}
                      onChange={() => setOpsiId(o.id)}
                    />
                    <span>
                      <span className="font-semibold text-slate-700">{o.method.name}</span>
                      {o.etd && <span className="ml-1 text-xs text-slate-400">{o.etd}</span>}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {o.cost > 0 ? formatIDR(o.cost) : 'Gratis'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">
            Ongkir
            {pickup ? null : opsiTerpilih?.method?.name ? ` — ${opsiTerpilih.method.name}` : ''}
            {!pickup && ongkirJarak > 0 ? (
              <span className="ml-1 text-slate-400">({ongkirJarak.toFixed(1)} km)</span>
            ) : null}
            {!pickup && ongkirBerat ? (
              <span className="ml-1 text-slate-400">({(ongkirBerat / 1000).toFixed(2)} kg)</span>
            ) : null}
          </span>
          <span className="font-semibold">
            {/* Ambil di outlet selalu Rp 0 — backend tidak menghitung ongkir
                sama sekali untuk pickup. Tanpa cabang ini, ringkasan menagihkan
                ongkir metode kirim padahal pesanannya diambil sendiri. */}
            {pickup
              ? 'Gratis'
              : shippingLoading
                ? '…'
                : ongkir
                  ? formatIDR(ongkir)
                  : shipping && shipping.available
                    ? 'Gratis'
                    : '—'}
          </span>
        </div>

        {/* Catatan halus untuk pembeli: tarif ekspedisi masih perkiraan karena
            merchant belum melengkapi berat produknya. Ini informasi, bukan
            kesalahan pembeli — jangan tampil sebagai peringatan merah. */}
        {!pickup && ongkirBerat && shipping?.weight_complete === false && (
          <p className="mt-1 text-[10px] text-slate-400">
            Berat paket masih perkiraan karena sebagian produk belum diisi beratnya.
          </p>
        )}
        {!pickup && shipping && !shipping.available && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {pesanTidakTersedia(shipping)}
          </p>
        )}
        {coupon && (
          <div className="mt-1 flex justify-between text-sm text-emerald-700">
            <span className="text-slate-500">Diskon kupon ({coupon.code})</span>
            <span className="font-semibold">-{formatIDR(coupon.discount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
          <span>Total</span>
          <span>{formatIDR(Math.max(0, total + ongkir - (coupon?.discount ?? 0)))}</span>
        </div>
        <p className="mt-1 text-right text-[10px] text-slate-400">Total akhir dihitung saat checkout.</p>
        {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition hover:opacity-90"
          style={{ background: 'var(--brand, #111)' }}
        >
          {busy ? 'Memproses…' : 'Buat Pesanan'}
        </button>
      </aside>
    </form>
  );
}
