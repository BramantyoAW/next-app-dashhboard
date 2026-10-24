'use client'

import React, { useState, useEffect } from 'react'
import { graphqlClient } from '@/graphql/graphqlClient'
import { getActiveStoreId } from '@/lib/jwt'
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
const CHANNEL_META: Record<string, { label: string; tone: string }> = {
  whatsapp: { label: 'WA',     tone: 'ok' },
  telegram: { label: 'Telegram', tone: 'info' },
  browser:  { label: 'Web',    tone: 'warn' },
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
  const storeId = token ? getActiveStoreId(token) : null

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
      <div className="ds-page-head">
        <div>
          <h2 className="ds-h1">Messages</h2>
          <p className="ds-hint">Log percakapan pelanggan</p>
        </div>
        <span className="ds-caption">{filtered.length} percakapan</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 ds-icon-muted" />
          <input
            type="text"
            placeholder="Cari nama atau nomor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ds-input"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'whatsapp', 'telegram', 'browser'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className="ds-btn"
              data-variant={filterChannel === ch ? 'primary' : 'secondary'}
            >
              {ch === 'all' ? 'Semua' : CHANNEL_META[ch]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Table */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead className="ds-thead">
              <tr>
                <th>Nama</th>
                <th>Channel</th>
                <th>Terakhir Pesan</th>
                <th>Waktu</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--ds-primary)', borderTopColor: 'transparent' }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center ds-caption">
                    Tidak ada percakapan
                  </td>
                </tr>
              ) : filtered.map((conv) => {
                const meta = CHANNEL_META[conv.channel] ?? { label: conv.channel, tone: 'neutral' }
                return (
                  <tr key={`${conv.sender_id}-${conv.channel}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)', fontSize: 12, fontWeight: 600 }}>
                          {(conv.username || conv.sender_id)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="ds-body" style={{ fontWeight: 600 }}>{conv.username || conv.sender_id}</p>
                          <p className="ds-caption">{conv.sender_id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ds-badge" data-tone={meta.tone}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <p className="ds-small max-w-xs truncate">{conv.last_message || '—'}</p>
                    </td>
                    <td>
                      <span className="ds-caption">{formatTime(conv.last_message_at)}</span>
                    </td>
                    <td className="text-center">
                      <button className="p-2 rounded-lg transition-colors group" title="Lihat">
                        <Eye size={14} className="ds-icon-muted transition-colors" />
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