'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace(`/storefront/${hash}/sign-in?next=/storefront/${hash}/checkout`);
      return;
    }
    setItems(loadCart(hash));
    // Load the customer's saved addresses (address book).
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
    // Load the web store's configured payment methods (public).
    gqlFetch<{ webStoreBySlug: { payment_methods: PaymentMethod[] } | null }>(
      `query($slug: String!) {
        webStoreBySlug(slug: $slug) { payment_methods { id type name bank_name account_number account_name instructions is_free enabled } }
      }`,
      { slug: hash },
    )
      .then((d) => {
        const list = (d?.webStoreBySlug?.payment_methods ?? []).filter((m) => m.enabled);
        setPaymentMethods(list);
        setSelectedPm(list[0]?.id ?? '');
      })
      .catch(() => {});
  }, [hash, router]);

  // Fetch shipping (ongkir) estimate for the cart. No dest lat/lng is collected
  // on checkout, so coordinates are omitted — distance-based methods fall back
  // to their min_cost (or 0). The backend computes the final shipping cost.
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
      <div className="rounded-2xl border bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h2 className="text-lg font-semibold">Pesanan berhasil dibuat!</h2>
        <p className="mt-1 text-sm text-neutral-500">Selesaikan pembayaran untuk memproses pesanan Anda.</p>
        <pre className="mt-4 rounded-xl bg-neutral-50 p-4 text-left text-xs whitespace-pre-wrap text-neutral-700">{placed.instructions}</pre>
        <div className="mt-4 flex justify-center gap-2 text-sm">
          <Link href={`/storefront/${hash}/orders/${placed.orderId}`} className="rounded-lg bg-neutral-900 px-4 py-2 text-white">
            Lihat Pesanan
          </Link>
          <Link href={`/storefront/${hash}`} className="rounded-lg border px-4 py-2">Kembali Belanja</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-neutral-50 p-10 text-center text-sm text-neutral-500">
        Keranjang kosong.
        <div className="mt-3">
          <Link href={`/storefront/${hash}`} className="underline">Kembali belanja</Link>
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
    if (!recipient || !phone || !address) {
      setErr('Nama, telepon, dan alamat wajib diisi');
      return;
    }
    if (!selectedPm) {
      setErr('Pilih metode pembayaran');
      return;
    }
    setBusy(true);
    try {
      if (saveAddr) await saveAddressNow();
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
            shipping_address: {
              recipient,
              phone,
              address_line: address,
              city: city || null,
              province: province || null,
              postal_code: postalCode || null,
              is_default: true,
            },
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
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Alamat Pengiriman</h2>

        {addresses.length > 0 && (
          <div>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
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
          </div>
        )}

        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Nama penerima" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="No. HP" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <textarea className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Alamat lengkap" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Provinsi" value={province} onChange={(e) => setProvince(e.target.value)} />
        </div>
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Kode pos (opsional)" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />

        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />
          Simpan alamat ini ke buku alamat saya
        </label>
      </section>

      <div className="space-y-4">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">Metode Pembayaran</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-neutral-400">Metode bayar belum diatur toko.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${selectedPm === m.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
                  <input
                    type="radio"
                    name="pm"
                    value={m.id}
                    checked={selectedPm === m.id}
                    onChange={() => setSelectedPm(m.id)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center justify-between font-medium">
                      {m.name}
                      {m.is_free && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">GRATIS</span>}
                    </span>
                    {m.bank_name && <span className="text-neutral-500">{m.bank_name}</span>}
                    {m.account_number && <span className="block text-neutral-600">No. {m.account_number}{m.account_name ? ` a.n. ${m.account_name}` : ''}</span>}
                    {m.instructions && <span className="block text-xs text-neutral-400">{m.instructions}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <CouponInput hash={hash} subtotal={total} onCouponApplied={setCoupon} />

        <aside className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Ringkasan</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((i) => (
              <li key={`${i.store_product_id}-${i.variant_key ?? ''}`} className="flex justify-between">
                <span className="line-clamp-1 pr-2">
                  {i.name} × {i.qty}
                  {i.variant ? <span className="text-neutral-400"> — {i.variant}</span> : null}
                </span>
                <span>{formatIDR(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-2 text-sm">
            <span className="text-neutral-500">
              Ongkir
              {shipping?.method?.name ? ` — ${shipping.method.name}` : ''}
            </span>
            <span className="font-medium">
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
              <span className="text-neutral-500">Diskon kupon ({coupon.code})</span>
              <span className="font-medium">-{formatIDR(coupon.discount)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatIDR(Math.max(0, total + (shipping?.cost ?? 0) - (coupon?.discount ?? 0)))}</span>
          </div>
          <p className="mt-1 text-right text-[10px] text-neutral-400">
            Total akhir dihitung saat checkout.
          </p>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            {busy ? 'Memproses…' : 'Buat Pesanan'}
          </button>
        </aside>
      </div>
    </form>
  );
}
