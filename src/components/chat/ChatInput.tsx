'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { SendHorizonal, Paperclip, Smile, X, FileText, Image as ImageIcon } from 'lucide-react'

type ChatInputProps = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  // CHANGED: Prop baru untuk upload file
  onFileUpload?: (file: File) => void
  onButtonSelect?: (text: string) => void
}

export default function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = 'Ketik pesan...',
  onFileUpload
}: ChatInputProps) {
  const [text, setText] = useState('')
  // CHANGED: State untuk preview file
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    
    // CHANGED: Jika ada file terpilih, panggil onFileUpload
    if (selectedFile) {
      if (onFileUpload) {
        onFileUpload(selectedFile)
      }
      clearFilePreview()
      // Jika juga ada teks, apakah kita kirim teks? Di flow N8N biasanya 1 media 1 text (caption).
      // Tergantung implementasi, untuk saat ini jika ingin support teks + media, bisa kita panggil onSend setelahnya.
      if (trimmed) {
        onSend(trimmed)
        setText('')
      }
      textareaRef.current?.focus()
      return
    }

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
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }

  // CHANGED: Handler file pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    
    // Create preview URL if image
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  // CHANGED: Clear preview
  const clearFilePreview = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasContent = !!text.trim() || !!selectedFile

  return (
    <div className="flex flex-col bg-white border-t border-slate-100 shadow-sm relative z-20">
      
      {/* CHANGED: Preview Area jika ada file */}
      {selectedFile && (
        <div className="px-4 pt-3 pb-1">
          <div className="relative inline-flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl pr-10 animate-fade-in-up">
            <button 
              onClick={clearFilePreview}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors shadow-md z-10"
            >
              <X size={14} />
            </button>
            
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
            ) : (
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center border border-blue-200">
                <FileText size={24} />
              </div>
            )}
            
            <div className="flex flex-col justify-center min-w-[120px] max-w-[200px]">
              <p className="text-sm font-semibold text-slate-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* CHANGED: Tombol Paperclip buka file picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <Paperclip size={20} />
        </button>

        {/* CHANGED: Tombol Emoji dengan Tooltip "Segera hadir" */}
        <div className="relative group flex-shrink-0">
          <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <Smile size={20} />
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
            Segera hadir
          </div>
        </div>

        {/* CHANGED: Tombol Mic dihapus */}

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
            // CHANGED: border lebih rounded (rounded-2xl), focus sedikit lebih gelap
            className="w-full resize-none px-4 py-2.5 bg-slate-50 focus:bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!hasContent || disabled}
          // CHANGED: animasi scale muncul saat ada konten (active:scale-95)
          className={`p-2.5 rounded-2xl flex-shrink-0 transition-all shadow-sm ${
            hasContent && !disabled
              ? 'bg-gradient-brand text-white hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-70'
          }`}
        >
          <SendHorizonal size={20} />
        </button>
      </div>
    </div>
  )
}
