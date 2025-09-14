"use client"

import { useEffect, useState } from "react"
import { graphqlClient } from "@/graphql/graphqlClient"
import { GET_ORDERS_BY_STORE, GetOrdersByStoreResponse } from "@/graphql/query/order/getAllOrderByStore"
import { useProfile } from "@/app/dashboard/layout"
import { extractStoreId } from '@/lib/jwt'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const profile = useProfile()

  useEffect(() => {
    async function fetchOrders() {
      try {
       const token = localStorage.getItem('token')
      const storeId = extractStoreId(token)

        if (!token) throw new Error("Token not found")

        graphqlClient.setHeader("Authorization", `Bearer ${token}`)
        const res = await graphqlClient.request<GetOrdersByStoreResponse>(
          GET_ORDERS_BY_STORE,
          { store_id: storeId, page: 1, limit: 10 }
        )

        setOrders(res.getOrdersByStore.data)
      } catch (err) {
        console.error("Failed to fetch orders:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  if (loading) return <p className="text-gray-500">Loading orders...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Orders</h1>

      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Order Number</th>
              <th className="px-6 py-3 border-b">Total</th>
              <th className="px-6 py-3 border-b">Discount</th>
              <th className="px-6 py-3 border-b">Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 border-b font-medium text-gray-800">
                  {order.order_number}
                </td>
                <td className="px-6 py-4 border-b">
                  Rp {order.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  Rp {order.discount.toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  <ul className="list-disc pl-5 space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        Product {item.product_id} —{" "}
                        <span className="text-gray-700 font-medium">{item.qty}</span> × Rp{" "}
                        {item.price.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
