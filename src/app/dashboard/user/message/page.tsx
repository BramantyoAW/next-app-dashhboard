'use client'

import React, { useState, useEffect } from 'react'
import { graphqlClient } from '@/graphql/graphqlClient'
import { extractStoreId } from '@/lib/jwt'
import { Search, Eye } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Conversation = {
  sender_id: string
  channel: string
  username: string
  store_id: string
  last_message: string
  last_message_at: string | null
  total_messages: number
  unread_count: number
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const CHANNEL_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WA',     color: 'bg-emerald-100 text-emerald-700' },
  telegram: { label: 'Telegram', color: 'bg-blue-100 text-blue-700' },
  browser:  { label: 'Web',    color: 'bg-amber-100 text-amber-700' },
}

function formatTime(date: string | null) {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'Baru'
  if (diffMins < 60) return `${diffMins}m lalu`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}j lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading]             = useState(false)
  const [search, setSearch]               = useState('')
  const [filterChannel, setFilterChannel] = useState('all')

  const token   = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const storeId = token ? extractStoreId(token) : null

  useEffect(() => {
    if (!token || !storeId) return
    setLoading(true)
    graphqlClient
      .setHeaders({ Authorization: `Bearer ${token}` })
      .request(`query GetConversationsByStore($store_id: ID!) {
        getConversationsByStore(store_id: $store_id) {
          sender_id channel username store_id last_message last_message_at total_messages unread_count
        }
      }`, { store_id: storeId })
      .then((res: any) => setConversations(res.getConversationsByStore || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [token, storeId])

  const filtered = conversations.filter((c) => {
    const matchSearch =
      (c.username || '').toLowerCase().includes(search.toLowerCase()) ||
      c.sender_id.includes(search)
    const matchChannel = filterChannel === 'all' || c.channel === filterChannel
    return matchSearch && matchChannel
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900">Messages</h2>
          <p className="text-xs text-slate-400 font-medium">Log percakapan pelanggan</p>
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} percakapan</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau nomor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'whatsapp', 'telegram', 'browser'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                filterChannel === ch
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {ch === 'all' ? 'Semua' : CHANNEL_META[ch]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nama</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Channel</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Terakhir Pesan</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Waktu</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs font-semibold text-slate-400">
                    Tidak ada percakapan
                  </td>
                </tr>
              ) : filtered.map((conv) => {
                const meta = CHANNEL_META[conv.channel] ?? { label: conv.channel, color: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={`${conv.sender_id}-${conv.channel}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(conv.username || conv.sender_id)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{conv.username || conv.sender_id}</p>
                          <p className="text-[10px] text-slate-400">{conv.sender_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-600 max-w-xs truncate">{conv.last_message || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-400 font-medium">{formatTime(conv.last_message_at)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button className="p-2 rounded-lg hover:bg-blue-50 transition-colors group" title="Lihat">
                        <Eye size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}