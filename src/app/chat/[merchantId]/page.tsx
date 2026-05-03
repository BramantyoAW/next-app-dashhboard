'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useProfile } from '@/app/dashboard/layout'
import ChatBubble from '@/components/chat/ChatBubble'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatInput from '@/components/chat/ChatInput'
import { ShoppingBag, Loader2, WifiOff, MessageCircle } from 'lucide-react'

// CHANGED: Update tipe ChatMessage sesuai requirements
type ChatMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  status: string
  type: string
  created_at: string
  username: string | null
  // Tambah field baru
  buttons?: string[]
  file_url?: string
  file_name?: string
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

  const handleSend = async (text: string, type: string = 'text', fileUrl?: string) => {
    if (!storeId) return

    setSending(true)

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      direction: 'inbound', // Browser chat outbound to system is 'inbound' direction to webhook
      text,
      status: 'pending',
      type: type,
      created_at: new Date().toISOString(),
      username: profile?.me?.user?.full_name ?? 'You',
      file_url: fileUrl,
      file_name: type !== 'text' ? text : undefined
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const token = localStorage.getItem('token') || ''
      const payload: any = {
        text,
        store_id: storeId,
        type: type,
      }
      if (fileUrl) payload.file_url = fileUrl

      const res = await fetch(`/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
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

  // CHANGED: File upload handler
  const handleFileUpload = async (file: File) => {
    if (!storeId) return
    setSending(true)
    
    // Determine type
    const isImage = file.type.startsWith('image/')
    const type = isImage ? 'image' : 'file'
    const tempUrl = URL.createObjectURL(file)

    // 1. Optimistic bubble
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      direction: 'inbound',
      text: file.name, // Usually use text field for caption or filename
      status: 'pending',
      type: type,
      created_at: new Date().toISOString(),
      username: profile?.me?.user?.full_name ?? 'You',
      file_url: tempUrl,
      file_name: file.name
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const token = localStorage.getItem('token') || ''
      
      // 2. Kirim ke endpoint yang SAMA dengan teks biasa
      // POST /api/chat/send — sudah handle FormData di Laravel
      const formData = new FormData()
      formData.append('file', file)
      formData.append('store_id', String(storeId))
      formData.append('channel', 'browser')
      formData.append('type', type)

      const sendRes = await fetch(`/api/chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Accept is optional, let browser set Content-Type with boundary for FormData
        },
        body: formData,
      })

      if (!sendRes.ok) throw new Error(`HTTP ${sendRes.status}`)

      // Response might contain the real uploaded URL if the API returns it
      const resData = await sendRes.json()
      const uploadedUrl = resData.file_url || tempUrl

      // Update temp message status and URL
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'done', file_url: uploadedUrl } : m)
      )
      
      setTimeout(() => fetchMessages(false), 2000)
    } catch (err) {
      console.error('[Chat] Upload/Send error:', err)
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m)
      )
    } finally {
      // Clean up local preview URL
      setTimeout(() => URL.revokeObjectURL(tempUrl), 10000)
      setSending(false)
    }
  }

  // CHANGED: Button click handler (dari bubble bot)
  const handleButtonClick = (msgId: string, buttonText: string) => {
    // Sembunyikan buttons di bubble tersebut
    setMessages(prev => 
      prev.map(m => m.id === msgId ? { ...m, buttons: [] } : m)
    )
    // Kirim pesan biasa
    handleSend(buttonText)
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
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white relative">

      {/* Chat Header */}
      <ChatHeader
        merchantName={merchantName}
        merchantImage={merchantImage}
        isOnline={isPolling}
        // CHANGED: Lempar props baru
        storeId={storeId}
        channel="browser"
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
                  {/* CHANGED: Update props yang dilempar ke ChatBubble */}
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
                    buttons={msg.buttons}
                    type={msg.type}
                    fileUrl={msg.file_url}
                    fileName={msg.file_name}
                    senderName={msg.direction !== 'inbound' ? merchantName : undefined}
                    onButtonClick={(btnText) => handleButtonClick(msg.id, btnText)}
                  />
                </React.Fragment>
              )
            })}

            {/* Typing indicator placeholder */}
            {sending && (
              <div className="flex justify-end mb-2">
                <div className="bg-gradient-brand border border-blue-500 rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
        onSend={(text) => handleSend(text)}
        // CHANGED: Lempar handleFileUpload ke ChatInput
        onFileUpload={handleFileUpload}
        disabled={sending || loading}
        placeholder="Ketik pesan di sini..."
      />
    </div>
  )
}