'use client'

import React, { useState } from 'react'
import { ArrowLeft, MoreVertical, Search, Info } from 'lucide-react'

type ChatHeaderProps = {
  merchantName: string
  merchantImage?: string
  isOnline?: boolean
  onBack?: () => void
  // CHANGED: Tambah prop storeId, channel, dan onToggleInfo
  storeId?: number | string
  channel?: string
  onToggleInfo?: () => void
}

export default function ChatHeader({ 
  merchantName, 
  merchantImage, 
  isOnline = false, 
  onBack,
  storeId,
  channel,
  onToggleInfo
}: ChatHeaderProps) {
  // CHANGED: State untuk toggle info bar
  const [showInfo, setShowInfo] = useState(false)

  const handleToggleInfo = () => {
    setShowInfo(!showInfo)
    if (onToggleInfo) onToggleInfo()
  }

  // CHANGED: Helper untuk badge warna berdasarkan channel
  const getChannelColor = (ch?: string) => {
    if (!ch) return 'bg-slate-100 text-slate-600'
    const lower = ch.toLowerCase()
    if (lower === 'whatsapp') return 'bg-emerald-100 text-emerald-700'
    if (lower === 'telegram') return 'bg-blue-100 text-blue-700'
    return 'bg-indigo-100 text-indigo-700'
  }

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm z-10 relative">
      <div className="flex items-center gap-3 px-4 py-3">
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
            // CHANGED: Avatar lebih besar (44px, w-11 h-11) dan rounded-xl
            <img src={merchantImage} alt={merchantName} className="w-11 h-11 rounded-xl object-cover shadow-sm" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold shadow-sm text-lg">
              {merchantName[0]?.toUpperCase() ?? 'M'}
            </div>
          )}
          {isOnline && (
            // CHANGED: Status online pulse di kanan bawah avatar
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-slate-800 truncate">{merchantName}</p>
            {/* CHANGED: Badge channel di samping atau di bawah nama */}
            {channel && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getChannelColor(channel)}`}>
                {channel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {/* CHANGED: Dot hijau + teks Online hijau */}
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <p className={`text-xs font-semibold ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        {/* CHANGED: Kanan header tombol Search & Info & MoreVertical */}
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
            <Search size={20} />
          </button>
          <button 
            onClick={handleToggleInfo}
            className={`p-2 rounded-xl transition-colors ${showInfo ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <Info size={20} />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* CHANGED: Subtle info bar di bawah header (toggle hide) */}
      {showInfo && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 animate-fade-in-up">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span><strong>Store ID:</strong> {storeId ?? '-'}</span>
            <span>&middot;</span>
            <span><strong>Channel:</strong> <span className="capitalize">{channel ?? 'Browser'}</span></span>
          </p>
        </div>
      )}
    </div>
  )
}
