"use client"

import { Store, ChevronDown } from "lucide-react"

type Outlet = { id: number | string; name: string }

export default function OutletSelect({
  stores,
  value,
  onChange,
  className = "",
}: {
  stores: Outlet[]
  value: number | null
  onChange: (id: number) => void
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 pl-10 pr-9 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
      >
        {stores.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
    </div>
  )
}
