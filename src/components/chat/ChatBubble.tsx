'use client'

import React from 'react'
import { Check, CheckCheck } from 'lucide-react'

type ChatBubbleProps = {
  text: string
  isOwn: boolean        // true = kirim dari user (kanan), false = dari merchant (kiri)
  timestamp: Date
  status?: 'sent' | 'delivered' | 'read' | 'pending'
}

export default function ChatBubble({ text, isOwn, timestamp, status = 'sent' }: ChatBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
          isOwn
            ? 'bg-gradient-brand text-white rounded-br-md'
            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md'
        }`}
      >
        <p className="break-words whitespace-pre-wrap">{text}</p>

        {/* Timestamp + status */}
        <div
          className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${
            isOwn ? 'text-blue-200 justify-end' : 'text-slate-400 justify-start'
          }`}
        >
          <span>{timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && (
            <span className="ml-1">
              {status === 'read' ? (
                <CheckCheck size={12} className="text-blue-200" />
              ) : status === 'delivered' ? (
                <CheckCheck size={12} className="text-blue-300" />
              ) : status === 'sent' ? (
                <Check size={12} className="text-blue-300" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse inline-block" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
