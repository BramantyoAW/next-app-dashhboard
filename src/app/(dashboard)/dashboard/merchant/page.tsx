"use client"

import { useEffect, useState } from "react"
import { myStoresService, MyStore } from "@/graphql/query/myStores"
import { merchantCreateStoreService } from "@/graphql/mutation/merchantCreateStore"
import { resolveImageUrl } from "@/lib/imageUtils"
import { gqlFetch } from "@/lib/graphqlClient"
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
  const [newAddress, setNewAddress] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [duplicateFrom, setDuplicateFrom] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [modalMsg, setModalMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)

  // Modal edit
  const [editStore, setEditStore] = useState<MyStore | null>(null)
  const [editName, setEditName] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)

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
    setNewAddress("")
    setNewPhone("")
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

  function openEditModal(store: MyStore) {
    setEditMsg(null)
    setEditStore(store)
    setEditName(store.name)
    setEditAddress(store.address ?? "")
    setEditPhone(store.phone ?? "")
    setEditSaving(false)
  }

  async function updateStore() {
    if (!editStore) return
    setEditSaving(true)
    setEditMsg(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Token not found")
      await gqlFetch(
        `mutation UpdateStore($id: ID!, $name: String, $address: String, $phone: String) {
          updateStore(id: $id, name: $name, address: $address, phone: $phone) { id }
        }`,
        { id: editStore.id, name: editName, address: editAddress, phone: editPhone },
        token
      )
      setEditMsg({ kind: "ok", msg: "Outlet berhasil diperbarui!" })
      await fetchStores()
      setTimeout(() => setEditStore(null), 1000)
    } catch (e: any) {
      setEditMsg({ kind: "err", msg: e?.message ?? "Gagal menyimpan" })
    } finally {
      setEditSaving(false)
    }
  }

  async function createStore() {
    if (!newName.trim()) {
      setModalMsg({ kind: "err", msg: "Nama outlet wajib diisi." })
      return
    }
    if (!newAddress.trim()) {
      setModalMsg({ kind: "err", msg: "Alamat outlet wajib diisi." })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setSaving(true)
    setModalMsg(null)
    try {
      await merchantCreateStoreService(token, {
        name: newName.trim(),
        address: newAddress.trim(),
        phone: newPhone.trim() || undefined,
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
    <div className="p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="ds-page-head mb-8">
          <div>
            <h1 className="ds-display">Merchant / Outlet</h1>
            <p className="ds-hint">
              Semua outlet milik Anda. Produk & stok dikelola dari satu dashboard; pilih outlet saat membuat produk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStores}
              className="ds-btn"
              data-variant="secondary"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={openModal}
              className="ds-btn"
              data-variant="primary"
            >
              <Plus size={16} /> Tambah Outlet
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin ds-accent-text mx-auto mb-3" size={32} />
            <p className="ds-small">Memuat daftar outlet...</p>
          </div>
        ) : error ? (
          <div className="ds-alert justify-center" data-tone="bad">
            {error}
          </div>
        ) : stores.length === 0 ? (
          <div className="ds-card ds-empty">
            <Store className="ds-icon-muted mb-4" size={56} />
            <p className="ds-small">Belum ada outlet.</p>
            <button
              onClick={openModal}
              className="ds-btn mt-4"
              data-variant="primary"
            >
              <Plus size={16} /> Buat Outlet Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stores.map((store) => (
              <div
                key={store.id}
                className="ds-card overflow-hidden"
              >
                <div className="p-6 flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(store.image || "")}
                    alt={store.name}
                    className="h-16 w-16 rounded-2xl object-cover shrink-0"
                    style={{ background: "var(--ds-surface-2)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="ds-h2 truncate">{store.name}</h3>
                      <button
                        onClick={() => openEditModal(store)}
                        className="ml-auto ds-btn-sm"
                        data-tone="neutral"
                      >
                        Edit
                      </button>
                      {store.role && (
                        <span className="ds-badge" data-tone="ok">
                          <BadgeCheck size={10} /> {store.role}
                        </span>
                      )}
                    </div>
                    <p className="ds-caption mt-0.5 truncate">
                      {store.address || store.phone || "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="ds-badge" data-tone="ok">
                        <Package size={12} /> {store.product_count ?? 0} Produk
                      </span>
                      <span className="ds-badge" data-tone="info">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div className="ds-card ds-card-pad w-full max-w-md max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="ds-h1 flex items-center gap-2">
                  <Plus size={18} className="ds-accent-text" /> Tambah Outlet Baru
                </h2>
                <button onClick={() => setShowModal(false)} className="ds-btn" data-variant="ghost" data-size="sm" aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="ds-label">Nama Outlet *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Toko Cabang Malioboro"
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="ds-label">Alamat Outlet *</label>
                  <textarea
                    rows={3}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Jl. Malioboro No. 1, Yogyakarta 55213"
                    className="ds-textarea"
                  />
                  <p className="ds-hint">Alamat ditampilkan saat customer memilih "Ambil di Outlet".</p>
                </div>

                <div>
                  <label className="ds-label">Telepon (opsional)</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="08123456789"
                    className="ds-input"
                  />
                </div>

                {stores.length > 0 && (
                  <div>
                    <label className="ds-label flex items-center gap-1.5">
                      <Copy size={12} /> Duplicate Produk dari Outlet?
                    </label>
                    <select
                      value={duplicateFrom}
                      onChange={(e) => setDuplicateFrom(e.target.value)}
                      className="ds-select"
                    >
                      <option value="">— Tidak duplicate —</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <p className="ds-hint">
                      Produk & varian akan disalin ke outlet baru dengan stok 0. {stores.length === 1 && "Karena hanya ada 1 outlet, otomatis terpilih sebagai sumber."}
                    </p>
                  </div>
                )}

                {modalMsg && (
                  <div className="ds-alert" data-tone={modalMsg.kind === "ok" ? "ok" : "bad"}>
                    {modalMsg.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {modalMsg.msg}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowModal(false)}
                    className="ds-btn flex-1"
                    data-variant="secondary"
                  >
                    Batal
                  </button>
                  <button
                    onClick={createStore}
                    disabled={saving}
                    className="ds-btn flex-1"
                    data-variant="primary"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Buat Outlet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Edit Outlet */}
        {editStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div className="ds-card ds-card-pad w-full max-w-md max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="ds-h1 flex items-center gap-2">
                  <Store size={18} className="ds-accent-text" /> Edit Outlet
                </h2>
                <button onClick={() => setEditStore(null)} className="ds-btn" data-variant="ghost" data-size="sm" aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="ds-label">Nama Outlet *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="ds-label">Alamat Outlet *</label>
                  <textarea
                    rows={3}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Jl. Malioboro No. 1, Yogyakarta 55213"
                    className="ds-textarea"
                  />
                  <p className="ds-hint">Alamat ditampilkan saat customer memilih "Ambil di Outlet".</p>
                </div>

                <div>
                  <label className="ds-label">Telepon</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="ds-input"
                  />
                </div>

                {editMsg && (
                  <div className="ds-alert" data-tone={editMsg.kind === "ok" ? "ok" : "bad"}>
                    {editMsg.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {editMsg.msg}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditStore(null)}
                    className="ds-btn flex-1"
                    data-variant="secondary"
                  >
                    Batal
                  </button>
                  <button
                    onClick={updateStore}
                    disabled={editSaving}
                    className="ds-btn flex-1"
                    data-variant="primary"
                  >
                    {editSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Simpan
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
