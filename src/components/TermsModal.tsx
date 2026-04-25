// components/TermsModal.tsx
'use client';
import React, { useEffect, useRef } from 'react';
import { X, Check, XCircle } from 'lucide-react';

export default function TermsModal({
  htmlContent,
  onCancel,
  onApprove,
}: {
  htmlContent: string;
  onCancel: () => void;
  onApprove: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // click outside to close
  const onBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
      onMouseDown={onBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Syarat & Ketentuan</h2>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
          <div 
            className="prose prose-slate max-w-none text-slate-600 leading-relaxed
                       prose-headings:text-slate-900 prose-headings:font-bold
                       prose-h1:text-3xl prose-h1:mb-8 prose-h1:text-center
                       prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
                       prose-ul:list-disc prose-ul:pl-5
                       prose-li:mb-2"
            dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-center text-slate-400 italic">Memuat konten...</p>' }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
          >
            <XCircle size={18} />
            Batal
          </button>
          <button
            onClick={onApprove}
            className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-95"
          >
            <Check size={18} />
            Setuju
          </button>
        </div>
      </div>
    </div>
  );
}
