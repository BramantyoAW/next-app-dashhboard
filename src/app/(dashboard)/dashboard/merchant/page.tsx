"use client"

import { useEffect, useState } from "react"
import { myStoresService, MyStore } from "@/graphql/query/myStores"
import { resolveImageUrl } from "@/lib/imageUtils"
import { Store, Package, Boxes, Coins, RefreshCw, Loader2, BadgeCheck } from "lucide-react"

export default function MerchantPage() {
  const [stores, setStores] = useState<MyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchStores() {
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Token not found")
      const res = await myStoresService(token)
      setStores(res.myStores || [])
      setError("")
    } catch (err: any) {
      console.error("Failed to fetch stores:", err)
      setError("Gagal memuat daftar outlet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Merchant / Outlet</h1>
            <p className="text-sm text-slate-500 mt-1">
              Semua outlet milik Anda. Produk & stok dikelola dari satu dashboard; pilih outlet saat membuat produk.
            </p>
          </div>
          <button
            onClick={fetchStores}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={32} />
            <p className="text-slate-400 font-bold">Memuat daftar outlet...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-600 font-semibold text-center">
            {error}
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
            <Store className="mx-auto text-slate-300 mb-4" size={56} />
            <p className="text-slate-400 font-semibold">Belum ada outlet.</p>
            <p className="text-sm text-slate-400 mt-1">Buat outlet baru dari menu profil (Add New Store).</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all"
              >
                <div className="p-6 flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(store.image || "")}
                    alt={store.name}
                    className="h-16 w-16 rounded-2xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate">{store.name}</h3>
                      {store.role && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                          <BadgeCheck size={10} /> {store.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {store.address || store.phone || "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                        <Package size={12} /> {store.product_count ?? 0} Produk
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-[11px] font-bold">
                        <Boxes size={12} /> {store.stock_total ?? 0} Stok
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[11px] font-bold">
                        <Coins size={12} /> {store.points ?? 0} Poin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
