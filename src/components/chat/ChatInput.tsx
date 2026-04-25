'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { SendHorizonal, Paperclip, Smile, Mic } from 'lucide-react'

type ChatInputProps = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled = false, placeholder = 'Ketik pesan...' }: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Auto-resize textarea
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-slate-100 shadow-sm">
      {/* Attachment */}
      <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0">
        <Paperclip size={20} />
      </button>

      {/* Emoji */}
      <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0">
        <Smile size={20} />
      </button>

      {/* Text input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full resize-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          style={{ maxHeight: '120px' }}
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className={`p-2.5 rounded-2xl flex-shrink-0 transition-all shadow-sm ${
          text.trim() && !disabled
            ? 'bg-gradient-brand text-white hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        <SendHorizonal size={20} />
      </button>
    </div>
  )
}
