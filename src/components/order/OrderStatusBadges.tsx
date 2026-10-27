'use client';

import { Clock, Package, Truck, CheckCircle2, XCircle, RotateCcw, Boxes } from 'lucide-react';

/**
 * Badge tiga sumbu status.
 *
 * `status` lama digabung jadi satu teks, dan itu sumber kebingungan: order
 * "shipped" tidak memberi tahu apakah uangnya sudah masuk, dan "completed" bisa
 * berarti dua hal berbeda. Di sini uang, barang, dan siklus ditampilkan
 * terpisah supaya owner tahu persis apa yang kurang.
 */

type Tone = 'ok' | 'wait' | 'bad' | 'info' | 'muted';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  wait: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  muted: 'bg-slate-50 text-slate-600 border-slate-200',
};

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  unpaid: { label: 'Belum bayar', tone: 'wait' },
  awaiting_confirmation: { label: 'Menunggu konfirmasi', tone: 'wait' },
  paid: { label: 'Dibayar', tone: 'ok' },
  refunded: { label: 'Dikembalikan', tone: 'info' },
  expired: { label: 'Kedaluwarsa', tone: 'bad' },
};

const FULFILLMENT: Record<string, { label: string; tone: Tone }> = {
  unfulfilled: { label: 'Belum dikirim', tone: 'wait' },
  processing: { label: 'Disiapkan', tone: 'info' },
  partially_fulfilled: { label: 'Sebagian dikirim', tone: 'info' },
  fulfilled: { label: 'Terkirim', tone: 'ok' },
  returned: { label: 'Dikembalikan', tone: 'bad' },
};

const LIFECYCLE: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'Berjalan', tone: 'info' },
  completed: { label: 'Selesai', tone: 'ok' },
  cancelled: { label: 'Dibatalkan', tone: 'bad' },
};

function Pill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function PaymentBadge({ status }: { status?: string | null }) {
  const m = PAYMENT[status ?? ''] ?? { label: status ?? '-', tone: 'muted' as Tone };
  return <Pill icon={<Clock size={10} />} label={m.label} tone={m.tone} />;
}

export function FulfillmentBadge({ status }: { status?: string | null }) {
  const m = FULFILLMENT[status ?? ''] ?? { label: status ?? '-', tone: 'muted' as Tone };
  const icon = status === 'fulfilled' ? <CheckCircle2 size={10} /> : <Truck size={10} />;
  return <Pill icon={icon} label={m.label} tone={m.tone} />;
}

export function LifecycleBadge({ status }: { status?: string | null }) {
  const m = LIFECYCLE[status ?? ''] ?? { label: status ?? '-', tone: 'muted' as Tone };
  const icon =
    status === 'completed' ? (
      <CheckCircle2 size={10} />
    ) : status === 'cancelled' ? (
      <XCircle size={10} />
    ) : (
      <RotateCcw size={10} />
    );
  return <Pill icon={icon} label={m.label} tone={m.tone} />;
}

/** Tiga badge berdampingan. */
export function OrderStatusBadges({
  payment,
  fulfillment,
  lifecycle,
}: {
  payment?: string | null;
  fulfillment?: string | null;
  lifecycle?: string | null;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <PaymentBadge status={payment} />
      <FulfillmentBadge status={fulfillment} />
      <LifecycleBadge status={lifecycle} />
    </span>
  );
}

const FIELD_LABEL: Record<string, string> = {
  payment: 'Pembayaran',
  fulfillment: 'Pengiriman',
  lifecycle: 'Siklus',
};

const VALUE_LABEL: Record<string, string> = {
  unpaid: 'belum bayar',
  awaiting_confirmation: 'menunggu konfirmasi',
  paid: 'dibayar',
  refunded: 'dikembalikan',
  expired: 'kedaluwarsa',
  unfulfilled: 'belum dikirim',
  processing: 'disiapkan',
  partially_fulfilled: 'sebagian dikirim',
  fulfilled: 'terkirim',
  returned: 'dikembalikan',
  open: 'berjalan',
  completed: 'selesai',
  cancelled: 'dibatalkan',
};

const ACTOR_LABEL: Record<string, string> = {
  owner: 'Owner',
  customer: 'Customer',
  system: 'Sistem',
};

/** Timeline transisi status, urut lama ke baru. */
export function OrderTimeline({ entries }: { entries: OrderHistoryEntryLike[] }) {
  if (!entries?.length) {
    return <p className="ds-caption">Belum ada riwayat status.</p>;
  }

  return (
    <ol className="relative space-y-3 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
      {entries.map((h) => (
        <li key={h.id} className="relative">
          <span
            className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <div className="text-sm">
            <span className="font-medium">{FIELD_LABEL[h.field] ?? h.field}</span>{' '}
            <span className="ds-caption">
              {h.from ? `${VALUE_LABEL[h.from] ?? h.from} → ` : ''}
              <span className="font-semibold">{VALUE_LABEL[h.to] ?? h.to}</span>
            </span>
          </div>
          <div className="ds-caption">
            {ACTOR_LABEL[h.actor_type] ?? h.actor_type}
            {h.note ? ` • ${h.note}` : ''} •{' '}
            {new Date(h.created_at).toLocaleString('id-ID', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

type OrderHistoryEntryLike = {
  id: string;
  field: string;
  from: string | null;
  to: string;
  actor_type: string;
  note: string | null;
  created_at: string;
};

/** Sisa waktu bayar, mis. "sisa 3j 12m" atau "lewat 2j". */
export function ExpiryCountdown({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;

  const ms = new Date(expiresAt).getTime() - Date.now();
  const lewat = ms <= 0;
  const total = Math.abs(ms);
  const jam = Math.floor(total / 3_600_000);
  const menit = Math.floor((total % 3_600_000) / 60_000);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${lewat ? 'text-rose-600' : 'text-amber-600'}`}
    >
      <Clock size={10} />
      {lewat ? `lewat ${jam}j ${menit}m` : `sisa ${jam}j ${menit}m`}
    </span>
  );
}

/** Ringkasan paket: isi tiap paket + statusnya. */
export function ShipmentList({
  shipments,
  itemNames,
}: {
  shipments: {
    id: string;
    status: string;
    tracking_number: string | null;
    courier_name: string | null;
    fulfilled_items: { order_item_id: number | string; qty: number }[] | null;
  }[];
  itemNames: Record<string, string>;
}) {
  if (!shipments?.length) return null;

  return (
    <div className="space-y-2">
      {shipments.map((s, i) => (
        <div key={s.id} className="ds-subcard !p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Boxes size={12} /> Paket {i + 1}
              {s.courier_name ? <span className="ds-caption">• {s.courier_name}</span> : null}
            </span>
            <span className="ds-caption">{s.tracking_number ?? 'belum ada resi'}</span>
          </div>
          <div className="ds-caption mt-1">
            {(s.fulfilled_items ?? [])
              .map((f) => `${itemNames[String(f.order_item_id)] ?? `item ${f.order_item_id}`} × ${f.qty}`)
              .join(', ') || 'isi paket tidak tercatat'}
          </div>
        </div>
      ))}
    </div>
  );
}
