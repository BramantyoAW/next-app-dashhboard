'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';
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
  is_default: boolean;
};

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

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace(`/storefront/${hash}/sign-in?next=/storefront/${hash}/checkout`);
      return;
    }
    setItems(loadCart(hash));
    gqlFetch<{ customerMe: { addresses: SavedAddress[] } | null }>(
      `query { customerMe { addresses { id label recipient phone address_line city province postal_code is_default } } }`,
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
    gqlFetch<{ webStoreBySlug: { payment_methods: PaymentMethod[]; pickup_outlets: PickupOutlet[] } | null }>(
      `query($slug: String!) {
        webStoreBySlug(slug: $slug) {
          payment_methods { id type name bank_name account_number account_name instructions is_free enabled }
          pickup_outlets { id name address phone is_open }
        }
      }`,
      { slug: hash },
    )
      .then((d) => {
        const list = (d?.webStoreBySlug?.payment_methods ?? []).filter((m) => m.enabled);
        setPaymentMethods(list);
        setSelectedPm(list[0]?.id ?? '');
        setPickupOutlets(d?.webStoreBySlug?.pickup_outlets ?? []);
      })
      .catch(() => {});
  }, [hash, router]);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    setShippingLoading(true);
    estimateShipping({
      web_store_slug: hash,
      items: items.map((i) => ({ store_product_id: i.store_product_id, qty: i.qty })),
      subtotal: cartTotal(items),
    })
      .then((d) => {
        if (!cancelled) setShipping(d?.estimateShipping ?? null);
      })
      .catch(() => {
        if (!cancelled) setShipping(null);
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hash, items]);

  if (placed) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Pesanan berhasil dibuat!</h2>
        <p className="mt-1 text-sm text-slate-500">Selesaikan pembayaran untuk memproses pesanan Anda.</p>
        <pre className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-xs whitespace-pre-wrap text-slate-700">{placed.instructions}</pre>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <Link href={`/storefront/${hash}/orders/${placed.orderId}`} className="rounded-full bg-slate-900 px-5 py-2 font-bold text-white">
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

  function applyAddress(a: SavedAddress) {
    setRecipient(a.recipient);
    setPhone(a.phone);
    setAddress(a.address_line);
    setCity(a.city ?? '');
    setProvince(a.province ?? '');
    setPostalCode(a.postal_code ?? '');
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
        upsertCustomerAddress(input: $i) { id label recipient phone address_line city province postal_code is_default }
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
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">
            Ongkir
            {shipping?.method?.name ? ` — ${shipping.method.name}` : ''}
          </span>
          <span className="font-semibold">
            {shippingLoading
              ? '…'
              : shipping && shipping.cost > 0
                ? formatIDR(shipping.cost)
                : shipping && shipping.available
                  ? 'Gratis'
                  : '—'}
          </span>
        </div>
        {coupon && (
          <div className="mt-1 flex justify-between text-sm text-emerald-700">
            <span className="text-slate-500">Diskon kupon ({coupon.code})</span>
            <span className="font-semibold">-{formatIDR(coupon.discount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
          <span>Total</span>
          <span>{formatIDR(Math.max(0, total + (shipping?.cost ?? 0) - (coupon?.discount ?? 0)))}</span>
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
