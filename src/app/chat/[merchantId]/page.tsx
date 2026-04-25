'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useProfile } from '@/app/dashboard/layout'
import ChatBubble from '@/components/chat/ChatBubble'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatInput from '@/components/chat/ChatInput'
import { MoreHorizontal, ShoppingBag } from 'lucide-react'

// TODO: Ganti dengan data dari API / WebSocket
const DUMMY_MESSAGES = [
  {
    id: 'm1',
    from: 'merchant',
    text: 'Halo! Selamat datang di toko kami. Ada yang bisa saya bantu?',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'read' as const,
  },
  {
    id: 'm2',
    from: 'user',
    text: 'Halo! Saya mau tanya soal produk yang di halaman katalog.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    status: 'read' as const,
  },
  {
    id: 'm3',
    from: 'merchant',
    text: 'Tentu! Silakan tanya produk yang mana, saya bantu carikan.',
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    status: 'read' as const,
  },
  {
    id: 'm4',
    from: 'user',
    text: 'Saya lihat ada produk "Sistem Kasir OmBot" — apakah bisa digunakan untuk beberapa kasir sekaligus?',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'read' as const,
  },
  {
    id: 'm5',
    from: 'merchant',
    text: 'Bisa! Licensenya mendukung multi-device, jadi beberapa kasir bisa login sekaligus di perangkat berbeda. Tidak ada biaya tambahan per kasir.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    status: 'delivered' as const,
  },
  {
    id: 'm6',
    from: 'merchant',
    text: 'Ada yang perlu ditanyakan lagi? Saya siap membantu! 😊',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'delivered' as const,
  },
]

export default function ChatPage({ params }: { params: { merchantId: string } }) {
  const profile = useProfile()
  const merchantId = params.merchantId

  // TODO: Ambil dari API — nama merchant, avatar, online status
  const merchantName = profile?.me?.user?.store_name ?? 'Toko OmBot'
  const merchantImage = profile?.me?.user?.store_image
  // TODO: Ambil real online status dari WebSocket / heartbeat API
  const isMerchantOnline = true

  const userId = profile?.me?.user?.id ?? 'user_001'

  const [messages, setMessages] = useState(DUMMY_MESSAGES)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    // TODO: Integrasi dengan WebSocket real-time
    // TODO: Kirim ke Laravel webhook: POST http://laravel:8000/api/whatsapp/webhook
    // body: { merchantId, from: userId, text, channel: 'browser' }

    const newMsg = {
      id: `m${Date.now()}`,
      from: 'user',
      text,
      timestamp: new Date(),
      status: 'pending' as const,
    }

    setMessages((prev) => [...prev, newMsg])

    // TODO: Ganti dengan WebSocket send atau fetch call
    try {
      // await fetch('http://localhost:8000/api/whatsapp/webhook', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ merchantId, from: userId, text, channel: 'browser' }),
      // })
      console.log(`[Chat → Laravel] merchantId=${merchantId} from=${userId} text="${text}" channel=browser`)

      // Update status jadi 'sent'
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as const } : m))
      )
    } catch (err) {
      console.error('[Chat] Gagal kirim pesan:', err)
      // Update status jadi 'error' (bisa ditambah state baru)
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as const } : m))
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">

      {/* Chat Header */}
      <ChatHeader
        merchantName={merchantName}
        merchantImage={merchantImage}
        isOnline={isMerchantOnline}
      />

      {/* Merchant Info Banner */}
      {/* TODO: Hapus atau sesuaikan — bisa muncul di chat dengan merchant baru */}
      <div className="flex items-center gap-3 px-5 py-3 bg-blue-50/60 border-b border-blue-100/50">
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
          <ShoppingBag size={14} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-blue-800">Percakapan dengan {merchantName}</p>
          <p className="text-[10px] text-blue-500 font-medium">
            Merchant ID: {merchantId} · Channel: Browser
          </p>
        </div>
        <button className="ml-auto p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
          <MoreHorizontal size={16} className="text-blue-400" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 bg-slate-50">
        {/* Date separator */}
        <div className="flex items-center justify-center mb-6">
          <span className="text-[10px] font-bold px-4 py-1 bg-white border border-slate-200 rounded-full text-slate-400 shadow-sm">
            Hari ini
          </span>
        </div>

        {/* TODO: Ganti dengan mapping dari API — termasuk date separator dinamis */}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            text={msg.text}
            isOwn={msg.from === 'user'}
            timestamp={msg.timestamp}
            status={msg.status}
          />
        ))}

        {/* Typing indicator */}
        {/* TODO: Aktifkan saat WebSocket mengirim event 'typing' dari merchant */}
        {false && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={isSending}
        placeholder="Ketik pesan di sini..."
      />
    </div>
  )
}