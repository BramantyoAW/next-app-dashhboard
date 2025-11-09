'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function UserMenu({
  userName,
  storeName,
  onLogout,
  onChangeStore,
}: {
  userName: string
  storeName?: string
  onLogout: () => void
  onChangeStore: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* ==== Trigger Button ==== */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1.5 shadow-sm hover:bg-gray-50 transition"
      >
        <div className="flex flex-col text-left leading-tight">
          <span className="text-gray-800 font-semibold text-sm">
            Halo, {userName}
          </span>
          {storeName && (
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              🏬 {storeName}
            </span>
          )}
        </div>
        <svg
          className="w-4 h-4 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {/* ==== Dropdown Menu ==== */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50">
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false)
                onChangeStore()
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg
                className="h-4 w-4 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M16 3h5v5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 21H3v-5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 3l-7 7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 21l7-7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Ubah Toko
            </button>

            <button
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 17l5-5-5-5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M21 12H9"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
