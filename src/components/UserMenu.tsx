import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { ChevronDown, Store, LogOut, User, Plus, Camera, X, CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { merchantCreateStoreService } from '@/graphql/mutation/merchantCreateStore'

export default function UserMenu({
  userName,
  storeName,
  storeImage,
  isStaff,
  onLogout,
  onChangeStore,
}: {
  userName: string
  storeName?: string
  storeImage?: string
  isStaff?: boolean
  onLogout: () => void
  onChangeStore: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showAddStore, setShowAddStore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', phone: '', address: '', image: null as File | null })
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token') || ''
    if (!token) return
    
    if (!formData.image) {
      setErrorMsg('Logo toko wajib diunggah.')
      return
    }
    
    setLoading(true)
    setErrorMsg(null)
    try {
      await merchantCreateStoreService(token, formData)
      setShowAddStore(false)
      setFormData({ name: '', description: '', phone: '', address: '', image: null })
      setShowSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat toko')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    onChangeStore()
  }

  // All modals rendered via portal to escape header overflow
  const modals = mounted ? ReactDOM.createPortal(
    <>
      {/* ==== Success Modal ==== */}
      {showSuccess && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-emerald-500/20 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 size={48} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Toko Berhasil Dibuat!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">Bisnis baru Anda telah terdaftar. Silakan pilih outlet untuk mulai mengelola.</p>
            </div>
            <button 
              onClick={handleSuccessClose}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
            >
              Pilih Outlet Sekarang
            </button>
          </div>
        </div>
      )}

      {/* ==== Error Modal ==== */}
      {errorMsg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-red-500/20 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Oops!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 transition-all active:scale-95"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ==== Add Store Modal ==== */}
      {showAddStore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <form 
            onSubmit={handleCreateStore}
            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New Store</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Start a new business venture</p>
               </div>
               <button 
                 type="button" 
                 onClick={() => setShowAddStore(false)} 
                 className="p-3 hover:bg-white rounded-2xl transition-all group active:scale-90"
               >
                 <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
               </button>
            </div>

            {/* Body (scrollable) */}
            <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
               {/* Logo Upload */}
               <div className="flex flex-col items-center gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Logo Toko</p>
                  <div className="relative group">
                    <div className={`w-28 h-28 rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer ${
                      formData.image 
                        ? 'border-primary/30 bg-white shadow-lg shadow-primary/10' 
                        : 'border-amber-300 bg-amber-50/50'
                    }`}>
                      {formData.image ? (
                        <img src={URL.createObjectURL(formData.image)} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Camera size={28} className="text-amber-400" />
                          <span className="text-[9px] font-bold text-amber-400 uppercase">Upload</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all border-3 border-white">
                      <Plus size={18} strokeWidth={3} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                      />
                    </label>
                  </div>
                  {!formData.image ? (
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full animate-pulse">⚠ Wajib Diunggah</span>
                  ) : (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">✓ Logo Terlampir</span>
                  )}
               </div>

               {/* Store Name */}
               <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Store Name</label>
                 <input
                   required
                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                   placeholder="e.g. OmBot Coffee & Roastery"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                 />
               </div>

               {/* Phone & Description */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                    <input
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                      placeholder="0812xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <input
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                      placeholder="Short description..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
               </div>

               {/* Address */}
               <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Store Address</label>
                 <textarea
                   rows={2}
                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold text-slate-900 resize-none placeholder:text-slate-300"
                   placeholder="Complete address..."
                   value={formData.address}
                   onChange={(e) => setFormData({...formData, address: e.target.value})}
                 />
               </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 flex-shrink-0">
               <button
                 type="button"
                 onClick={() => setShowAddStore(false)}
                 className="flex-1 py-3.5 px-5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
               >
                 Cancel
               </button>
               <button
                 type="submit"
                 disabled={loading}
                 className="flex-[2] py-3.5 px-5 bg-primary text-primary-foreground rounded-2xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                   <CheckCircle2 size={18} strokeWidth={2.5} />
                 )}
                 <span>Create Store</span>
               </button>
            </div>
          </form>
        </div>
      )}
    </>,
    document.body
  ) : null

  return (
    <div ref={ref} className="relative">
      {/* ==== Trigger Button ==== */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl bg-white border border-border p-1.5 pr-4 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 group active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110 overflow-hidden border border-border/50">
          {storeImage ? (
            <img src={storeImage} alt="Store" className="w-full h-full object-cover" />
          ) : (
            <User size={18} />
          )}
        </div>
        <div className="hidden sm:flex flex-col text-left leading-tight min-w-0">
          <span className="text-slate-900 font-bold text-sm truncate max-w-[150px]">
            {userName}
          </span>
          {storeName && (
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate max-w-[120px]">
              {storeName}
            </span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* ==== Dropdown Menu ==== */}
      {open && (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white border border-border shadow-2xl p-2 z-50 animate-in overflow-hidden">
           <div className="px-4 py-3 border-b border-border mb-1 lg:hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{storeName}</p>
           </div>
           
           {!isStaff && (
             <>
               <button
                 onClick={() => {
                   setOpen(false)
                   onChangeStore()
                 }}
                 className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-secondary rounded-xl flex items-center gap-3 transition-colors group"
               >
                 <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                   <Store size={16} />
                 </div>
                 <span className="font-medium">Switch Outlet</span>
               </button>

               <button
                 onClick={() => {
                   setOpen(false)
                   setShowAddStore(true)
                 }}
                 className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-secondary rounded-xl flex items-center gap-3 transition-colors group"
               >
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                   <Plus size={16} />
                 </div>
                 <span className="font-medium">Add New Store</span>
               </button>
             </>
           )}

           <button
             onClick={() => {
               setOpen(false)
               onLogout()
             }}
             className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl flex items-center gap-3 transition-colors group"
           >
             <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
               <LogOut size={16} />
             </div>
             <span className="font-bold">Logout</span>
           </button>
        </div>
      )}

      {/* Portaled modals */}
      {modals}
    </div>
  )
}
