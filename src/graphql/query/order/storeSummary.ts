import { gql } from "graphql-request"

/**
 * Agregat dashboard dari SQL. FE tidak lagi menjumlahkan satu halaman order,
 * jadi angka tetap benar setelah order ke-101.
 *
 * `series` tidak mengisi periode kosong dengan 0 — gap-fill tetap di
 * `src/app/(dashboard)/dashboard/page.tsx`.
 */
export const STORE_SUMMARY = gql`
  query StoreSummary($store_id: ID!, $date_from: String, $date_to: String) {
    storeSummary(store_id: $store_id, date_from: $date_from, date_to: $date_to) {
      store_id
      granularity
      total_sales
      total_orders
      avg_order_value
      top_products {
        name
        qty
      }
      status_counts {
        status
        total
      }
      series {
        key
        label
        sales
        orders
      }
    }
  }
`

export type StoreSummary = {
  store_id: string
  granularity: 'hari' | 'bulan'
  total_sales: number
  total_orders: number
  avg_order_value: number
  top_products: { name: string; qty: number }[]
  status_counts: { status: string; total: number }[]
  series: { key: string; label: string; sales: number; orders: number }[]
}

export type StoreSummaryResponse = {
  storeSummary: StoreSummary
}
