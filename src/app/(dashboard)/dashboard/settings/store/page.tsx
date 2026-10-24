'use client'

import React, { useState, useEffect } from 'react'
import { useProfile } from '@/app/(dashboard)/dashboard/layout'
import { Camera, Save, History, ArrowLeft, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { gqlFetch } from '@/lib/graphqlClient'
import { resolveImageUrl } from '@/lib/imageUtils'

const UPDATE_STORE_MUTATION = `
  mutation UpdateStore($id: ID!, $name: String, $description: String, $image: Upload, $phone: String, $address: String) {
    updateStore(id: $id, name: $name, description: $description, image: $image, phone: $phone, address: $address) {
      id
      name
      image
      description
      phone
      address
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
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
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
      setPhone(profile?.me?.user?.store_phone || '')
      setAddress(profile?.me?.user?.store_address || '')
      setImagePreview(profile?.me?.user?.store_image ? resolveImageUrl(profile.me.user.store_image) : null)
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
        phone,
        address,
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* ==== Success Modal ==== */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="ds-card p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 size={48} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="ds-h1">Mantap!</h3>
              <p className="ds-small">Profil toko Anda telah berhasil diperbarui dan riwayat telah dicatat.</p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="ds-btn w-full"
              data-variant="primary"
            >
              Oke, Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ==== Error Modal ==== */}
      {errorMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="ds-card p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="ds-h1">Waduh!</h3>
              <p className="ds-small">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="ds-btn w-full"
              data-variant="danger"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Pengaturan Toko</h1>
          <p className="ds-hint">Kelola identitas dan profil bisnis Anda</p>
        </div>
        <Link href="/dashboard" className="ds-btn" data-variant="secondary">
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Update Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ds-card p-8">
            <form onSubmit={handleUpdate} className="space-y-8">
              <div className="flex flex-col sm:flex-row items-center gap-8 pb-8" style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <div className="relative group">
                  <div
                    className="w-32 h-32 rounded-[2rem] border-2 border-dashed flex items-center justify-center overflow-hidden transition-all"
                    style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border-strong)' }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={32} className="ds-icon-muted" />
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
                  <h3 className="ds-h2">Logo Toko</h3>
                  <p className="ds-caption max-w-sm">
                    Gunakan logo transparan berukuran minimal 512x512px dalam format PNG atau JPG untuk hasil terbaik di aplikasi.
                  </p>
                </div>
              </div>

              <div className="grid gap-8">
                <div className="space-y-2">
                  <label className="ds-label">Nama Toko Utama</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ds-input"
                    placeholder="Masukkan nama toko baru..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="ds-label">Nomor Telepon Bisnis</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="ds-input"
                      placeholder="e.g. 08123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ds-label">Slogan / Deskripsi Singkat</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="ds-input"
                      placeholder="e.g. Solusi laundry terbaik..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ds-label">Alamat Lengkap Toko</label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="ds-textarea"
                    placeholder="Tuliskan alamat lengkap outlet Anda..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn w-full sm:w-auto"
                  data-variant="primary"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} strokeWidth={2.5} />}
                  <span>Simpan Perubahan Profil</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Brand History */}
        <div className="space-y-6">
          <div className="ds-card overflow-hidden">
            <div
              className="p-6 flex items-center gap-3"
              style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}
            >
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                <History size={20} strokeWidth={2.5} />
              </div>
              <h3 className="ds-h2">Riwayat Branding</h3>
            </div>
            
            <div>
              {loadingHistory ? (
                <div className="ds-empty">
                  <Loader2 className="animate-spin ds-icon-muted" size={24} />
                  <span className="ds-caption">Memuat...</span>
                </div>
              ) : history.length > 0 ? (
                history.map((log) => (
                  <div key={log.id} className="p-5 space-y-3 group" style={{ borderBottom: "1px solid var(--ds-border)" }}>
                    <div className="flex justify-between items-center">
                      <span className="ds-badge" data-tone={
                        log.field === 'image' ? 'info' :
                        log.field === 'name' ? 'ok' :
                        'neutral'
                      }>
                        {log.field === 'image' ? 'Logo' : 
                         log.field === 'name' ? 'Nama' :
                         log.field === 'phone' ? 'Telepon' :
                         log.field === 'address' ? 'Alamat' : log.field}
                      </span>
                      <span className="ds-caption">
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {log.field === 'image' ? (
                        <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ds-primary)' }} />
                          <p className="ds-small">Logo Toko Diperbarui</p>
                        </div>
                      ) : (
                        <p className="ds-body leading-snug break-words group-hover:translate-x-1 transition-transform line-clamp-2">
                          {log.new_value || '(Kosong)'}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 ds-caption">
                         <span>Oleh</span>
                         <span>{log.user?.full_name}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="ds-empty">
                  <div className="ds-empty-icon w-12 h-12">
                    <History size={24} />
                  </div>
                  <p className="ds-caption">
                    Belum ada riwayat<br />perubahan brand
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
