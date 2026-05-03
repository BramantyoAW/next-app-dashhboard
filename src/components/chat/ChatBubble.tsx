'use client'

import React, { useState } from 'react'
import { Check, CheckCheck, FileText, Download, X } from 'lucide-react'

// CHANGED: Menambah tipe baru untuk message (type, fileUrl, fileName, buttons, senderName, onButtonClick)
type ChatBubbleProps = {
  text: string
  isOwn: boolean
  timestamp: Date
  status?: 'sent' | 'delivered' | 'read' | 'pending'
  buttons?: string[]
  senderName?: string
  type?: 'text' | 'image' | 'file' | string
  fileUrl?: string
  fileName?: string
  onButtonClick?: (btn: string) => void
}

export default function ChatBubble({ 
  text, 
  isOwn, 
  timestamp, 
  status = 'sent',
  buttons = [],
  senderName,
  type = 'text',
  fileUrl,
  fileName,
  onButtonClick
}: ChatBubbleProps) {
  // CHANGED: State untuk preview gambar fullscreen
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <>
      {/* CHANGED: Animasi keyframes dimasukkan di sini jika belum ada di globals.css */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      {/* CHANGED: Tambah class animasi animate-fade-in-up */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-4 animate-fade-in-up`}>
        
        {/* CHANGED: Tampilkan nama pengirim di atas bubble kiri */}
        {!isOwn && senderName && (
          <span className="text-[11px] text-slate-400 font-semibold mb-1 ml-1">
            {senderName}
          </span>
        )}

        <div
          className={`relative max-w-[75%] px-4 py-2.5 shadow-sm transition-all ${
            isOwn
              // CHANGED: Bubble kanan pakai gradient biru dan border radius diubah sedikit
              ? 'bg-gradient-brand text-white rounded-2xl rounded-br-sm'
              // CHANGED: Bubble kiri background putih bersih dengan subtle shadow
              : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
          }`}
        >
          {/* CHANGED: Render attachment sesuai tipe */}
          {type === 'image' && fileUrl && (
            <div className="mb-2 -mx-2 -mt-1 rounded-xl overflow-hidden cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
              <img src={fileUrl} alt={fileName || 'Image'} className="w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity" />
            </div>
          )}

          {type === 'file' && fileUrl && (
            <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${isOwn ? 'bg-white/10' : 'bg-slate-50 border border-slate-100'}`}>
              <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isOwn ? 'text-white' : 'text-slate-700'}`}>{fileName || 'Document'}</p>
                <p className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>Attachment</p>
              </div>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full hover:bg-black/5 transition-colors ${isOwn ? 'text-white' : 'text-slate-400 hover:text-blue-600'}`}>
                <Download size={18} />
              </a>
            </div>
          )}

          {/* CHANGED: Render teks jika ada */}
          {text && <p className="break-words whitespace-pre-wrap font-medium">{text}</p>}

          {/* Timestamp + status */}
          <div
            // CHANGED: Timestamp lebih subtle, opacity rendah
            className={`flex items-center gap-1 mt-1 text-[10px] font-semibold opacity-70 ${
              isOwn ? 'text-white justify-end' : 'text-slate-400 justify-start'
            }`}
          >
            <span>{timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            {isOwn && (
              <span className="ml-1">
                {status === 'read' ? (
                  <CheckCheck size={12} className="text-white" />
                ) : status === 'delivered' ? (
                  <CheckCheck size={12} className="text-white/80" />
                ) : status === 'sent' ? (
                  <Check size={12} className="text-white/80" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse inline-block" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* CHANGED: Render row of pill buttons jika ada */}
        {!isOwn && buttons && buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-1 max-w-[75%]">
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => onButtonClick && onButtonClick(btn)}
                className="px-4 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-bold rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm active:scale-95"
              >
                {btn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CHANGED: Modal/Dialog sederhana untuk preview gambar */}
      {isPreviewOpen && type === 'image' && fileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsPreviewOpen(false)}>
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors">
            <X size={24} />
          </button>
          <img src={fileUrl} alt={fileName || 'Preview'} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
