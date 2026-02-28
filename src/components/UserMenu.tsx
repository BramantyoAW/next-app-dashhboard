'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Store, LogOut, User, Plus, Camera, X } from 'lucide-react'
import { merchantCreateStoreService } from '@/graphql/mutation/merchantCreateStore'

export default function UserMenu({
  userName,
  storeName,
  onLogout,
  onChangeStore,
}: {
  userName: string
  storeName?: string
  onLogout: () => void
  onChangeStore: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showAddStore, setShowAddStore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', image: null as File | null })
  
  const ref = useRef<HTMLDivElement>(null)

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
      alert('Please upload a store logo/image. It is mandatory.')
      return
    }
    
    setLoading(true)
    try {
      await merchantCreateStoreService(token, formData)
      setShowAddStore(false)
      setFormData({ name: '', description: '', image: null })
      // Trigger a refresh if needed, usually chooseStore or profile refresh
      alert('Store created successfully! You can switch to it now.')
      onChangeStore() // Open the switch outlet modal to see the new store
    } catch (err: any) {
      alert(err.message || 'Failed to create store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* ==== Trigger Button ==== */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl bg-white border border-border p-1.5 pr-4 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 group active:scale-95"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110">
          <User size={18} />
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

      {/* ==== Add Store Modal ==== */}
      {showAddStore && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-slate-50">
               <div>
                 <h3 className="text-xl font-black text-slate-900">Add New Store</h3>
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Start a new business venture</p>
               </div>
               <button onClick={() => setShowAddStore(false)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm">
                 <X size={20} className="text-slate-400" />
               </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-8 space-y-6">
               <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className={`w-24 h-24 bg-slate-100 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors ${!formData.image ? 'border-amber-200 hover:border-amber-400' : 'border-slate-200 group-hover:border-primary/50'}`}>
                      {formData.image ? (
                        <img src={URL.createObjectURL(formData.image)} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <Camera size={24} className="text-slate-300 group-hover:text-primary transition-colors" />
                      )}
                      {!formData.image && <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Logo Required</span>}
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        required
                        onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">Store Image is Mandatory</p>
               </div>

               <div className="grid gap-5">
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Store Name</label>
                   <input
                     required
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-slate-900"
                     placeholder="e.g. OmBot Coffee & Roastery"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Description (Optional)</label>
                   <textarea
                     rows={3}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-slate-900 resize-none"
                     placeholder="Tell us a bit about this store..."
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                   />
                 </div>
               </div>

               <div className="pt-4 flex gap-3 mt-4">
                 <button
                   type="button"
                   onClick={() => setShowAddStore(false)}
                   className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={loading}
                   className="flex-[2] py-4 px-6 bg-primary text-primary-foreground rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {loading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>Create Store</>
                   )}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
