'use client'

import React, { useState, useEffect } from 'react'
import { useProfile } from '@/app/dashboard/layout'
import { Camera, Save, History, ArrowLeft, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { gqlFetch } from '@/lib/graphqlClient'

const UPDATE_STORE_MUTATION = `
  mutation UpdateStore($id: ID!, $name: String, $description: String, $image: Upload) {
    updateStore(id: $id, name: $name, description: $description, image: $image) {
      id
      name
      image
      description
    }
  }
`

const GET_STORE_HISTORY = `
  query StoreHistories($store_id: ID!, $page: Int, $limit: Int) {
    storeHistories(store_id: $store_id, page: $page, limit: $limit) {
      data {
        id
        field
        old_value
        new_value
        created_at
        user {
          full_name
        }
      }
      pagination {
        total
        current_page
        total_pages
      }
    }
  }
`

export default function StoreSettingsPage() {
  const profile = useProfile()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.me?.user?.store_id) {
      setName(profile?.me?.user?.store_name || '')
      setDescription(profile?.me?.user?.description || '')
      setImagePreview(profile?.me?.user?.store_image || null)
      fetchHistory()
    }
  }, [profile])

  const fetchHistory = async () => {
    if (!profile?.me?.user?.store_id) return
    setLoadingHistory(true)
    try {
      const token = localStorage.getItem('token')
      const res: any = await gqlFetch(GET_STORE_HISTORY, {
        store_id: profile.me.user.store_id,
        limit: 10,
        page: 1
      }, token || undefined)
      setHistory(res.storeHistories.data)
    } catch (err) {
      console.error('Failed to fetch store history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    try {
      const token = localStorage.getItem('token')
      await gqlFetch(UPDATE_STORE_MUTATION, {
        id: profile.me.user.store_id,
        name,
        description,
        image: image || undefined
      }, token || undefined)
      
      setShowSuccess(true)
      await profile.refreshProfile()
      fetchHistory()
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui toko')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ==== Success Modal ==== */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-emerald-500/20 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 size={48} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Mantap!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">Profil toko Anda telah berhasil diperbarui dan riwayat telah dicatat.</p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
            >
              Oke, Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ==== Error Modal ==== */}
      {errorMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-red-500/20 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Waduh!</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 transition-all active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengaturan Toko</h1>
          <p className="text-slate-500 font-medium">Kelola identitas dan profil bisnis Anda</p>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Update Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-8 pb-6 border-b border-slate-50">
                <div className="relative group">
                  <div className="w-32 h-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={32} className="text-slate-300 group-hover:text-primary transition-all" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all border-4 border-white">
                    <Camera size={18} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setImage(file)
                        if (file) setImagePreview(URL.createObjectURL(file))
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-slate-900">Logo Toko</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Gunakan logo transparan berukuran 512x512px dalam format PNG atau JPG untuk hasil terbaik.
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nama Toko</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-slate-900"
                    placeholder="Masukkan nama toko baru..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Deskripsi Toko</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-semibold text-slate-900 resize-none"
                    placeholder="Tuliskan sedikit tentang toko Anda..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Brand History */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                <History size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Riwayat Branding</h3>
            </div>
            
            <div className="divide-y divide-slate-50">
              {loadingHistory ? (
                <div className="p-12 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-slate-300" size={24} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat...</span>
                </div>
              ) : history.length > 0 ? (
                history.map((log) => (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                        {log.field}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {log.field === 'image' ? (
                        <p className="text-xs font-bold text-primary flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Gambar Toko Diperbarui</span>
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{log.new_value}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium">Oleh: {log.user?.full_name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada riwayat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
