'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useProfile } from '@/app/dashboard/layout'
import ChatBubble from '@/components/chat/ChatBubble'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatInput from '@/components/chat/ChatInput'
import { ShoppingBag, Loader2, WifiOff, MessageCircle } from 'lucide-react'

type ChatMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  status: string
  type: string
  created_at: string
  username: string | null
}

export default function ChatPage({ params }: { params: { merchantId: string } }) {
  const profile = useProfile()
  const merchantId = params.merchantId

  const merchantName = profile?.me?.user?.store_name ?? 'Toko OmBot'
  const merchantImage = profile?.me?.user?.store_image
  const storeId = profile?.me?.user?.store_id

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCount = useRef(0)


  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!storeId) return

    if (showLoading) setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`/api/chat/messages/${storeId}?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setMessages(data.data || [])
      setError(null)

      // Auto-scroll only if new messages arrived
      if (data.data?.length !== lastMessageCount.current) {
        lastMessageCount.current = data.data?.length || 0
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (err: any) {
      console.error('[Chat] Fetch error:', err)
      if (showLoading) setError('Gagal memuat pesan. Periksa koneksi Anda.')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  // Initial load
  useEffect(() => {
    if (storeId) {
      fetchMessages(true)
    }
  }, [storeId, fetchMessages])

  // Polling every 3 seconds
  useEffect(() => {
    if (!storeId || !isPolling) return

    pollingRef.current = setInterval(() => {
      fetchMessages(false)
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [storeId, isPolling, fetchMessages])

  // Auto-scroll on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    if (!storeId) return

    setSending(true)

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      direction: 'inbound',
      text,
      status: 'pending',
      type: 'text',
      created_at: new Date().toISOString(),
      username: profile?.me?.user?.full_name ?? 'You',
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text,
          store_id: storeId,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Update temp message status
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'done' } : m)
      )

      // Fetch fresh messages after a short delay to get the response
      setTimeout(() => fetchMessages(false), 2000)
    } catch (err) {
      console.error('[Chat] Send error:', err)
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m)
      )
    } finally {
      setSending(false)
    }
  }

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white">

      {/* Chat Header */}
      <ChatHeader
        merchantName={merchantName}
        merchantImage={merchantImage}
        isOnline={isPolling}
      />

      {/* Connection Status Banner */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100/50">
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
          <ShoppingBag size={14} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-800">Percakapan dengan {merchantName}</p>
          <p className="text-[10px] text-blue-500 font-medium">
            Store ID: {storeId} · Channel: Browser Chat
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-[10px] font-bold text-slate-500">{isPolling ? 'Live' : 'Paused'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 bg-gradient-to-b from-slate-50 to-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-400">Memuat percakapan...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
              <WifiOff size={28} className="text-rose-400" />
            </div>
            <p className="text-sm font-bold text-rose-500">{error}</p>
            <button
              onClick={() => fetchMessages(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all"
            >
              Coba Lagi
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center border border-blue-100/50">
              <MessageCircle size={36} className="text-blue-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-black text-slate-700">Mulai Percakapan</p>
              <p className="text-sm text-slate-400 font-medium">Kirim pesan pertama Anda untuk memulai.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              // Date separator
              const showDateLabel =
                index === 0 ||
                getDateLabel(msg.created_at) !== getDateLabel(messages[index - 1].created_at)

              return (
                <React.Fragment key={msg.id}>
                  {showDateLabel && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[10px] font-bold px-4 py-1 bg-white border border-slate-200 rounded-full text-slate-400 shadow-sm">
                        {getDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <ChatBubble
                    text={msg.text}
                    isOwn={msg.direction === 'inbound'}
                    timestamp={new Date(msg.created_at)}
                    status={
                      msg.status === 'done' ? 'delivered' :
                      msg.status === 'pending' || msg.status === 'processing' ? 'pending' :
                      msg.status === 'failed' ? 'sent' :
                      'sent'
                    }
                  />
                </React.Fragment>
              )
            })}

            {/* Typing indicator placeholder */}
            {sending && (
              <div className="flex justify-start mb-2">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={sending || loading}
        placeholder="Ketik pesan di sini..."
      />
    </div>
  )
}