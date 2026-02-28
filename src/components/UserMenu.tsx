'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Store, LogOut, User } from 'lucide-react'

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
        className="flex items-center gap-3 rounded-2xl bg-white border border-border p-1.5 pr-4 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 group active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110">
          <User size={18} />
        </div>
        <div className="hidden sm:flex flex-col text-left leading-tight min-w-0">
          <span className="text-slate-900 font-bold text-sm truncate max-w-[150px]">
            {userName}
          </span>
          {storeName && (
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate max-w-[120px]">
              {storeName}
            </span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* ==== Dropdown Menu ==== */}
      {open && (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white border border-border shadow-2xl p-2 z-50 animate-in overflow-hidden">
           <div className="px-4 py-3 border-b border-border mb-1 lg:hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{storeName}</p>
           </div>
           
           <button
             onClick={() => {
               setOpen(false)
               onChangeStore()
             }}
             className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-secondary rounded-xl flex items-center gap-3 transition-colors group"
           >
             <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
               <Store size={16} />
             </div>
             <span className="font-medium">Switch Outlet</span>
           </button>

           <button
             onClick={() => {
               setOpen(false)
               onLogout()
             }}
             className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl flex items-center gap-3 transition-colors group"
           >
             <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
               <LogOut size={16} />
             </div>
             <span className="font-bold">Logout</span>
           </button>
        </div>
      )}
    </div>
  )
}
