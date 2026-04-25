'use client'

import React, { useState } from 'react'
import { Search, MessageCircle, ExternalLink } from 'lucide-react'

// Dummy data — akan diganti dengan API
const DUMMY_CONVERSATIONS = [
  {
    id: 'c1',
    merchantId: 'merchant_001',
    from: '6281234567890',
    senderName: 'Andi Pratama',
    lastMessage: 'Halo, apakah produk ini masih tersedia?',
    preview: 'Halo, apakah produk ini masih tersedia? Saya mau order 2 lusin untuk acara kantor.',
    channel: 'whatsapp',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    unread: true,
  },
  {
    id: 'c2',
    merchantId: 'merchant_001',
    from: '6289876543210',
    senderName: 'Budi Santoso',
    lastMessage: 'Terima kasih atas pesanannya!',
    preview: 'Terima kasih atas pesanannya! Pesanan akan kami proses besok pagi.',
    channel: 'telegram',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    unread: false,
  },
  {
    id: 'c3',
    merchantId: 'merchant_001',
    from: '6285678901234',
    senderName: 'Citra Dewi',
    lastMessage: 'Mau tanya soal metode pembayaran',
    preview: 'Mau tanya soal metode pembayaran. Apakah bisa pakai transfer bank?',
    channel: 'browser',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    unread: true,
  },
  {
    id: 'c4',
    merchantId: 'merchant_001',
    from: '6282345678901',
    senderName: 'Dewi Lestari',
    lastMessage: 'Pesanan sudah diterima, Terima kasih!',
    preview: 'Pesanan sudah diterima, kondisi barang bagus. Terima kasih! ⭐⭐⭐⭐⭐',
    channel: 'whatsapp',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    unread: false,
  },
  {
    id: 'c5',
    merchantId: 'merchant_001',
    from: '6283456789012',
    senderName: 'Eko Prasetyo',
    lastMessage: 'Kapan estimasi pengiriman?',
    preview: 'Kapan estimasi pengiriman? Saya butuh sebelum akhir minggu ini.',
    channel: 'telegram',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    unread: false,
  },
  {
    id: 'c6',
    merchantId: 'merchant_001',
    from: '6284567890123',
    senderName: 'Fitri Handayani',
    lastMessage: 'Ada discount untuk pembelian grosir?',
    preview: 'Ada discount untuk pembelian grosir? Saya rencana order dalam jumlah besar.',
    channel: 'browser',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unread: false,
  },
]

const CHANNEL_META = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  telegram: {
    label: 'Telegram',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    dotColor: 'bg-blue-500',
  },
  browser: {
    label: 'Browser',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    dotColor: 'bg-amber-500',
  },
}

function formatTime(date: Date) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins}m lalu`
  if (diffHours < 24) return `${diffHours}j lalu`
  if (diffDays === 1) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function ConversationsPage() {
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState<string>('all')

  const filtered = DUMMY_CONVERSATIONS.filter((c) => {
    const matchSearch =
      c.senderName.toLowerCase().includes(search.toLowerCase()) ||
      c.from.includes(search) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
    const matchChannel = filterChannel === 'all' || c.channel === filterChannel
    return matchSearch && matchChannel
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-400 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Conversations</h1>
          <p className="text-slate-500 font-medium mt-1">Semua percakapan dari berbagai channel</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
          <MessageCircle size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">{DUMMY_CONVERSATIONS.length} percakapan</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor, atau pesan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'whatsapp', 'telegram', 'browser'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                filterChannel === ch
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {ch === 'all' ? 'Semua' : CHANNEL_META[ch as keyof typeof CHANNEL_META].label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
              <MessageCircle size={28} />
            </div>
            <p className="text-sm font-bold text-slate-400">Tidak ada percakapan yang cocok</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const meta = CHANNEL_META[conv.channel as keyof typeof CHANNEL_META]
            return (
              <div
                key={conv.id}
                className={`flex items-center gap-4 p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer group ${
                  conv.unread ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {conv.senderName[0]}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${conv.unread ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: meta.dotColor.replace('bg-', 'var(--tw-') }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`font-bold text-sm truncate ${conv.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {conv.senderName}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 font-semibold">{formatTime(conv.timestamp)}</span>
                      {conv.unread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium truncate flex-1 ${conv.unread ? 'text-slate-700' : 'text-slate-500'}`}>
                      {conv.lastMessage}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={16} className="text-blue-500" />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}