"use client"

import { useCallback, useEffect, useState } from "react"
import { useProfile } from "@/app/(dashboard)/dashboard/layout"
import { extractStoreId } from "@/lib/jwt"

/**
 * Hook utk "store aktif" di dashboard tunggal (tanpa switch store global).
 * - Outlet list dari profile.me.user.stores (semua outlet milik user).
 * - Default: store pertama (karena JWT tidak lagi punya store_id setelah login langsung).
 * - Pilihan disimpan di localStorage agar konsisten antar halaman.
 */
export function useActiveStore() {
  const profile = useProfile()
  const stores = profile?.me?.user?.stores ?? []

  const [activeStoreId, setActiveStoreId] = useState<number | null>(null)

  useEffect(() => {
    if (stores.length > 0 && activeStoreId === null) {
      // Prioritas: localStorage → store_id dari JWT (fallback lama) → store pertama
      const saved = localStorage.getItem("activeStoreId")
      const jwtStoreId = extractStoreId(localStorage.getItem("token") || "")
      const preferred = saved || jwtStoreId
      const found = stores.find((s: any) => String(s.id) === String(preferred))
      setActiveStoreId(found ? found.id : stores[0].id)
    }
  }, [stores, activeStoreId])

  const setStore = useCallback((id: number) => {
    setActiveStoreId(id)
    localStorage.setItem("activeStoreId", String(id))
  }, [])

  return {
    stores,
    activeStoreId,
    setStore,
    activeStore: stores.find((s: any) => s.id === activeStoreId) ?? null,
  }
}
