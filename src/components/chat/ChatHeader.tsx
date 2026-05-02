'use client'

import React from 'react'
import { ArrowLeft, MoreVertical, Phone, Video, Search } from 'lucide-react'
import Link from 'next/link'

type ChatHeaderProps = {
  merchantName: string
  merchantImage?: string
  isOnline?: boolean
  onBack?: () => void
}

export default function ChatHeader({ merchantName, merchantImage, isOnline = false, onBack }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Back button */}
      <button
        onClick={onBack}
        className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
      >
        <ArrowLeft size={20} className="text-slate-600" />
      </button>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {merchantImage ? (
          <img src={merchantImage} alt={merchantName} className="w-10 h-10 rounded-full object-cover shadow-sm" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold shadow-sm">
            {merchantName[0]?.toUpperCase() ?? 'M'}
          </div>
        )}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{merchantName}</p>
        <p className={`text-[11px] font-semibold ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </p>
      </div>

    </div>
  )
}
