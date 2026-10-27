/**
 * Pembentuk berkas ekspor order: CSV, Excel (xlsx), dan PDF.
 *
 * Semua format memakai satu sumber baris yang sama (orderRows/itemRows),
 * supaya angka di CSV, Excel, dan PDF tidak pernah berbeda.
 *
 * Catatan: pemisah CSV memakai ';' karena Excel dengan locale Indonesia
 * memperlakukan ',' sebagai desimal. Ganti ke ',' bila targetnya tool non-Excel.
 */
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type OrderLike = {
  id: number | string
  order_number: string
  created_at: string
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  channel?: string | null
  total_amount: number
  discount?: number | null
  shipping_cost?: number | null
  shipping_address?: string | null
  tracking_number?: string | null
  additional_data?: unknown
  items?: Array<{
    name?: string | null
    qty?: number | null
    price?: number | null
    subtotal?: number | null
    discount?: number | null
  }> | null
  user?: { full_name?: string | null } | null
  customer?: { name?: string | null; email?: string | null; phone?: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  pending_payment: 'Belum Bayar',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  success: 'Selesai',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
}

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: 'Belum Bayar',
  paid: 'Lunas',
  refunded: 'Dikembalikan',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
}

export function statusLabel(v?: string | null): string {
  if (!v) return '-'
  return STATUS_LABEL[v] ?? v
}

export function paymentLabel(v?: string | null): string {
  if (!v) return '-'
  return PAYMENT_LABEL[v] ?? v
}

const rupiah = (n?: number | null) => Number(n ?? 0)

/**
 * Backend mengirim datetime tanpa zona, mis. "2026-10-27 08:47:55", dan
 * nilainya sudah WIB. Tanpa penanda zona, `new Date()` membacanya sebagai
 * waktu lokal runtime (UTC di container) lalu digeser +7 saat diformat ke
 * Asia/Jakarta. Tempelkan offset +07:00 dulu bila string belum punya zona.
 */
function toDate(iso?: string | null): Date | null {
  if (!iso) return null
  const naive = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(iso.trim())
  const d = new Date(naive ? `${iso.trim().replace(' ', 'T')}+07:00` : iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Tanggal + jam dalam zona Asia/Jakarta. */
export function formatDateTime(iso?: string | null): string {
  const d = toDate(iso)
  if (!d) return '-'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

/** additional_data bisa berupa objek (cast Eloquent) atau string JSON. */
export function parseAdditional(v: unknown): Record<string, any> {
  if (!v) return {}
  if (typeof v === 'object') return v as Record<string, any>
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return p && typeof p === 'object' ? p : {}
    } catch {
      return {}
    }
  }
  return {}
}

/** Alamat kirim: pakai additional_data.shipping, fallback kolom shipping_address. */
export function shippingInfo(order: OrderLike) {
  const a = parseAdditional(order.additional_data)
  const s = (a.shipping ?? {}) as Record<string, any>
  const parts = [s.address_line, s.city, s.province, s.postal_code].filter(Boolean)
  return {
    recipient: String(s.recipient ?? order.customer?.name ?? order.user?.full_name ?? '-'),
    phone: String(s.phone ?? order.customer?.phone ?? '-'),
    address: parts.length ? parts.join(', ') : String(order.shipping_address ?? '-'),
  }
}

/** Nama pelanggan: customer web diutamakan, lalu user kasir. */
export function customerName(order: OrderLike): string {
  return order.customer?.name || order.user?.full_name || '-'
}

/** Satu baris per item: "Nama x2 = Rp 15.000". */
export function itemLines(order: OrderLike): string {
  const items = order.items ?? []
  if (!items.length) return '-'
  return items
    .map((it) => {
      const qty = Number(it.qty ?? 0)
      const sub = it.subtotal != null ? rupiah(it.subtotal) : Number(it.price ?? 0) * qty
      return `${it.name ?? '-'} x${qty} = Rp ${sub.toLocaleString('id-ID')}`
    })
    .join('\n')
}

/** Baris ringkas tingkat order — dipakai CSV dan sheet "Orders". */
export function orderRows(orders: OrderLike[]) {
  return orders.map((o, i) => {
    const ship = shippingInfo(o)
    const items = o.items ?? []
    return {
      No: i + 1,
      'Order Number': o.order_number,
      Tanggal: formatDateTime(o.created_at),
      Status: statusLabel(o.status),
      'Status Bayar': paymentLabel(o.payment_status),
      Saluran: o.channel === 'web' ? 'Web' : 'Kasir',
      Pelanggan: customerName(o),
      Penerima: ship.recipient,
      Telepon: ship.phone,
      Alamat: ship.address,
      'Jumlah Item': items.reduce((s, it) => s + Number(it.qty ?? 0), 0),
      'Detail Item': itemLines(o),
      Subtotal: rupiah(o.total_amount) - rupiah(o.shipping_cost) + rupiah(o.discount),
      Diskon: rupiah(o.discount),
      Ongkir: rupiah(o.shipping_cost),
      Total: rupiah(o.total_amount),
      Resi: o.tracking_number || '-',
    }
  })
}

/** Baris tingkat item — dipakai sheet "Items" supaya qty & harga bisa dihitung. */
export function itemRows(orders: OrderLike[]) {
  const out: Record<string, unknown>[] = []
  for (const o of orders) {
    const ship = shippingInfo(o)
    for (const it of o.items ?? []) {
      const qty = Number(it.qty ?? 0)
      const price = rupiah(it.price)
      out.push({
        'Order Number': o.order_number,
        Tanggal: formatDateTime(o.created_at),
        Status: statusLabel(o.status),
        Pelanggan: customerName(o),
        Penerima: ship.recipient,
        Produk: it.name ?? '-',
        Qty: qty,
        'Harga Satuan': price,
        Diskon: rupiah(it.discount),
        Subtotal: it.subtotal != null ? rupiah(it.subtotal) : price * qty,
      })
    }
  }
  return out
}

/** Ringkasan angka untuk footer PDF dan sheet "Ringkasan". */
export function totals(orders: OrderLike[]) {
  const sum = (f: (o: OrderLike) => number) => orders.reduce((s, o) => s + f(o), 0)
  return {
    jumlahOrder: orders.length,
    jumlahItem: orders.reduce(
      (s, o) => s + (o.items ?? []).reduce((a, it) => a + Number(it.qty ?? 0), 0),
      0,
    ),
    subtotal: sum((o) => rupiah(o.total_amount) - rupiah(o.shipping_cost) + rupiah(o.discount)),
    diskon: sum((o) => rupiah(o.discount)),
    ongkir: sum((o) => rupiah(o.shipping_cost)),
    total: sum((o) => rupiah(o.total_amount)),
  }
}

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV dengan BOM UTF-8 supaya Excel membaca karakter & kolom dengan benar. */
export function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '\uFEFF'
  const headers = Object.keys(rows[0])
  const body = rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(';'))
  return '\uFEFF' + [headers.join(';'), ...body].join('\r\n')
}

export function saveCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, filename)
}

export function saveWorkbook(wb: unknown, filename: string) {
  // Model WorkBook dari xlsx tidak terekspos sebagai namespace type di sini.
  const buf = XLSX.write(wb as any, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, filename)
}

/** Workbook 3 sheet: Orders, Items, Ringkasan. */
export function buildWorkbook(orders: OrderLike[]) {
  const wb = XLSX.utils.book_new()

  const wsOrders = XLSX.utils.json_to_sheet(orderRows(orders))
  wsOrders['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 9 },
    { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 45 }, { wch: 11 }, { wch: 45 },
    { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders')

  const wsItems = XLSX.utils.json_to_sheet(itemRows(orders))
  wsItems['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
    { wch: 40 }, { wch: 6 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsItems, 'Items')

  const t = totals(orders)
  const wsSum = XLSX.utils.json_to_sheet([
    { Ringkasan: 'Jumlah Order', Nilai: t.jumlahOrder },
    { Ringkasan: 'Jumlah Item', Nilai: t.jumlahItem },
    { Ringkasan: 'Subtotal (Rp)', Nilai: t.subtotal },
    { Ringkasan: 'Diskon (Rp)', Nilai: t.diskon },
    { Ringkasan: 'Ongkir (Rp)', Nilai: t.ongkir },
    { Ringkasan: 'Total (Rp)', Nilai: t.total },
  ])
  wsSum['!cols'] = [{ wch: 22 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan')

  return wb
}

export type PdfOptions = {
  orders: OrderLike[]
  storeName: string
  /** Logo OmBot (base64/data URI). */
  logoBase64?: string
  /** Logo toko (base64/data URI). */
  storeLogoBase64?: string
  /** Ringkasan filter aktif, mis. ["Periode: 01 Okt - 27 Okt", "Petugas: Bram"]. */
  filterSummary?: string[]
}

/**
 * PDF A4 landscape: header (logo + nama toko + waktu cetak + filter aktif),
 * tabel rinci 10 kolom, lalu ringkasan angka dan nomor halaman.
 */
export function buildPdf(opts: PdfOptions): jsPDF {
  const { orders, storeName, logoBase64, storeLogoBase64, filterSummary = [] } = opts
  const doc = new jsPDF('l', 'mm', 'a4')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 12

  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', M, 8, 16, 16) } catch { /* logo opsional */ }
  }
  if (storeLogoBase64) {
    try { doc.addImage(storeLogoBase64, 'JPEG', W - M - 16, 8, 16, 16) } catch { /* opsional */ }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(storeName, W / 2, 15, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Laporan Penjualan', W / 2, 21, { align: 'center' })

  const now = formatDateTime(new Date().toISOString())
  doc.text(`Dicetak: ${now} WIB`, W / 2, 26, { align: 'center' })

  // Periode & filter aktif — supaya laporan bisa dipertanggungjawabkan.
  const info: string[] = []
  if (filterSummary.length) info.push(`Filter: ${filterSummary.join(' | ')}`)
  else info.push('Filter: semua transaksi')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(info[0].slice(0, 180), M, 32)

  const body = orders.map((o, i) => {
    const ship = shippingInfo(o)
    return [
      String(i + 1),
      o.order_number,
      formatDateTime(o.created_at),
      statusLabel(o.status),
      paymentLabel(o.payment_status),
      customerName(o),
      `${ship.recipient}\n${ship.phone}\n${ship.address}`,
      itemLines(o),
      `Rp ${rupiah(o.total_amount).toLocaleString('id-ID')}`,
      o.tracking_number || '-',
    ]
  })

  autoTable(doc, {
    startY: 35,
    margin: { left: M, right: M, bottom: 18 },
    head: [[
      'No', 'Order #', 'Tanggal', 'Status', 'Bayar', 'Pelanggan',
      'Penerima & Alamat', 'Item', 'Total', 'Resi',
    ]],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 32 },
      6: { cellWidth: 52 },
      7: { cellWidth: 55 },
      8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 22 },
    },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`${storeName} — Laporan Penjualan`, M, H - 8)
      doc.text(`Halaman ${page}`, W - M, H - 8, { align: 'right' })
    },
  })

  const t = totals(orders)
  let y = ((doc as any).lastAutoTable?.finalY ?? 40) + 8
  if (y > H - 40) {
    doc.addPage()
    y = 20
  }

  doc.setDrawColor(226, 232, 240)
  doc.line(M, y, W - M, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Ringkasan', M, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = [
    `Jumlah order: ${t.jumlahOrder}`,
    `Jumlah item: ${t.jumlahItem}`,
    `Subtotal: Rp ${t.subtotal.toLocaleString('id-ID')}`,
    `Diskon: Rp ${t.diskon.toLocaleString('id-ID')}`,
    `Ongkir: Rp ${t.ongkir.toLocaleString('id-ID')}`,
  ]
  lines.forEach((s, i) => doc.text(s, M, y + 6 + i * 5))

  // Kotak total di kanan.
  const boxW = 78
  const boxX = W - M - boxW
  doc.setFillColor(248, 250, 252)
  doc.rect(boxX, y, boxW, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('Total Penjualan', boxX + 4, y + 7)
  doc.setFontSize(14)
  doc.setTextColor(37, 99, 235)
  doc.text(`Rp ${t.total.toLocaleString('id-ID')}`, boxX + 4, y + 16)

  return doc
}
