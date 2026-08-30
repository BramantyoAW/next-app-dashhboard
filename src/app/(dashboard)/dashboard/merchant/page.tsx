"use client"

import { useEffect, useState } from "react"
import { myStoresService, MyStore } from "@/graphql/query/myStores"
import { merchantCreateStoreService } from "@/graphql/mutation/merchantCreateStore"
import { resolveImageUrl } from "@/lib/imageUtils"
import {
  Store,
  Package,
  Boxes,
  RefreshCw,
  Loader2,
  BadgeCheck,
  Plus,
  Copy,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export default function MerchantPage() {
  const [stores, setStores] = useState<MyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Modal create
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [duplicateFrom, setDuplicateFrom] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [modalMsg, setModalMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)

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

  function openModal() {
    setModalMsg(null)
    setNewName("")
    // 1 store → otomatis duplicate dari store itu; ≥2 → user pilih (default store pertama).
    if (stores.length === 1) {
      setDuplicateFrom(String(stores[0].id))
    } else if (stores.length > 1) {
      setDuplicateFrom(String(stores[0].id))
    } else {
      setDuplicateFrom("")
    }
    setShowModal(true)
  }

  async function createStore() {
    if (!newName.trim()) {
      setModalMsg({ kind: "err", msg: "Nama outlet wajib diisi." })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setSaving(true)
    setModalMsg(null)
    try {
      await merchantCreateStoreService(token, {
        name: newName.trim(),
        duplicate_products: !!duplicateFrom,
        duplicate_from_store_id: duplicateFrom || null,
      })
      setModalMsg({ kind: "ok", msg: "Outlet berhasil dibuat." })
      setShowModal(false)
      await fetchStores()
    } catch (e: any) {
      setModalMsg({ kind: "err", msg: e?.message ?? "Gagal membuat outlet." })
    } finally {
      setSaving(false)
    }
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStores}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold shadow-md transition-all"
            >
              <Plus size={16} /> Tambah Outlet
            </button>
          </div>
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
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold shadow-md"
            >
              <Plus size={16} /> Buat Outlet Pertama
            </button>
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Tambah Outlet */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus size={18} className="text-indigo-600" /> Tambah Outlet Baru
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Outlet *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Toko Cabang Malioboro"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {stores.length > 0 && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                      <Copy size={12} /> Duplicate Produk dari Outlet?
                    </label>
                    <select
                      value={duplicateFrom}
                      onChange={(e) => setDuplicateFrom(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— Tidak duplicate —</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Produk & varian akan disalin ke outlet baru dengan stok 0. {stores.length === 1 && "Karena hanya ada 1 outlet, otomatis terpilih sebagai sumber."}
                    </p>
                  </div>
                )}

                {modalMsg && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${modalMsg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {modalMsg.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {modalMsg.msg}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={createStore}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Buat Outlet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
