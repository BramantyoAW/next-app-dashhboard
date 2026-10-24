'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/graphql/mutation/catalog/createProduct'
import { uploadProductImage } from '@/graphql/mutation/catalog/uploadProductImage'
import { useActiveStore } from '@/hooks/useActiveStore'
import { resolveImageUrl } from '@/lib/imageUtils'
import { toast } from 'sonner'
import { Plus, Trash2, Store } from 'lucide-react'

type Varian = { name: string; value: string }

export default function CreateProductPage() {
  const [varian, setVarian] = useState<Varian[]>([])
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({
    sku: '',
    name: '',
    description: '',
    price: '0',
    image: '',
  })
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  // Local preview for uploaded file (blob URL)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  // === Outlet selection (multi-outlet) — dari profile.me.user.stores ===
  const { stores, activeStoreId } = useActiveStore()
  const [outlets, setOutlets] = useState<{ id: number; name: string; address?: string | null; phone?: string | null }[]>([])
  const [selectedOutlets, setSelectedOutlets] = useState<number[]>([])

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')
      setLoading(false)
    }
    bootstrap()
  }, [router])

  // Sinkronkan outlet dari profile ke state + default pilih store aktif.
  useEffect(() => {
    if (stores.length > 0) {
      setOutlets(stores)
      if (activeStoreId) {
        setSelectedOutlets(prev => (prev.length === 0 ? [activeStoreId] : prev))
      }
    }
  }, [stores, activeStoreId])

  const toggleOutlet = (id: number) => {
    setSelectedOutlets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleChange = (name: string, value: string) =>
    setFormValues(prev => ({ ...prev, [name]: value }))

  const updateVarian = (idx: number, field: 'name' | 'value', value: string) =>
    setVarian(prev => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)))
  const addVarian = () => setVarian(prev => [...prev, { name: '', value: '' }])
  const removeVarian = (idx: number) => setVarian(prev => prev.filter((_, i) => i !== idx))

  const handleFileUpload = async (file: File) => {
    // Show local preview immediately
    const blobUrl = URL.createObjectURL(file)
    setLocalPreview(blobUrl)
    setUploading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Not logged in')
        return
      }

      const imageUrl = await uploadProductImage(token, file)
      handleChange('image', imageUrl)
      toast.success('Image uploaded successfully')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Upload gagal')
      setLocalPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const parseProductError = (err: any): string => {
    const message = err?.response?.errors?.[0]?.message || err?.message || ''

    // SKU duplicate
    if (message.includes('Duplicate entry') && message.includes('sku_unique')) {
      return 'SKU sudah digunakan. Gunakan SKU yang berbeda.'
    }
    // Name duplicate
    if (message.includes('Duplicate entry') && message.includes('name_unique')) {
      return 'Nama product sudah digunakan.'
    }
    // Generic duplicate
    if (message.includes('Duplicate entry')) {
      return 'Data sudah ada di database. Periksa kembali SKU dan nama product.'
    }
    // Validation errors from extensions
    const validation = err?.response?.errors?.[0]?.extensions?.validation
    if (validation) {
      const messages = Object.values(validation).flat() as string[]
      if (messages.length > 0) {
        // Clean SQL details from error
        return messages[0].replace(/\(Connection:.*\)$/, '').trim()
      }
    }

    return 'Gagal menambahkan product. Periksa kembali data yang diinput.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')
      if (!activeStoreId) return

      if (selectedOutlets.length === 0) {
        setFormError('Pilih minimal 1 outlet (merchant) untuk produk ini.')
        toast.error('Pilih minimal 1 outlet')
        return
      }

      const { sku, name, description, price, image } = formValues
      const attrsInput = varian
        .filter(v => v.name.trim() && v.value.trim())
        .map(v => ({ name: v.name.trim(), value: v.value.trim() }))

      const res = await createProduct(
        token,
        activeStoreId,
        sku,
        name,
        description || '',
        Number(price),
        attrsInput,
        image || undefined,
        selectedOutlets
      )

      toast.success(`Product "${res.createProduct.name}" berhasil ditambahkan ke ${selectedOutlets.length} outlet!`)
      router.push('/dashboard/catalog/product')
    } catch (err: any) {
      console.error('Failed to create product:', err)
      const errorMsg = parseProductError(err)
      setFormError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // Determine preview image
  const getPreviewSrc = (): string => {
    if (localPreview) return localPreview
    if (formValues.image) return resolveImageUrl(formValues.image)
    return '/default-product.svg'
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  if (loading) return <p>Loading attributes...</p>

  return (
    <div className="flex p-8 gap-8 min-h-screen" style={{ background: 'var(--ds-bg)' }}>
      {/* ================= LEFT: FORM ================= */}
      <div className="flex-1 ds-card ds-card-pad">
        <h1 className="ds-display mb-6">Create Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          {formError && (
            <div className="ds-alert" data-tone="bad">
              {formError}
            </div>
          )}

          <div>
            <label className="ds-label">SKU</label>
            <input
              type="text"
              value={formValues.sku}
              onChange={e => handleChange('sku', e.target.value)}
              className="ds-input"
              required
            />
          </div>

          <div>
            <label className="ds-label">Name</label>
            <input
              type="text"
              value={formValues.name}
              onChange={e => handleChange('name', e.target.value)}
              className="ds-input"
              required
            />
          </div>

          <div>
            <label className="ds-label">Description</label>
            <textarea
              value={formValues.description}
              onChange={e => handleChange('description', e.target.value)}
              className="ds-textarea"
              rows={3}
            />
          </div>

          <div>
            <label className="ds-label">Price</label>
            <input
              type="number"
              value={formValues.price}
              onChange={e => handleChange('price', e.target.value)}
              className="ds-input"
              required
            />
          </div>

          {/* ============ Pilih Outlet (multi-outlet) ============ */}
          <div>
            <label className="ds-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Store size={16} /> Pilih Outlet / Merchant
            </label>
            <p className="ds-hint mb-2">
              Produk akan dibuat di outlet yang dipilih (stok 0 tiap outlet, diatur nanti di Inventory).
            </p>
            {outlets.length === 0 ? (
              <p className="ds-small">Memuat outlet...</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {outlets.map(o => (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors"
                    style={
                      selectedOutlets.includes(o.id)
                        ? { borderColor: 'var(--ds-primary)', background: 'color-mix(in srgb, var(--ds-primary) 6%, var(--ds-surface))' }
                        : { borderColor: 'var(--ds-border)', background: 'var(--ds-surface)' }
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedOutlets.includes(o.id)}
                      onChange={() => toggleOutlet(o.id)}
                      className="h-4 w-4 ds-switch"
                    />
                    <div className="min-w-0">
                      <p className="ds-body truncate" style={{ fontWeight: 600 }}>{o.name}</p>
                      <p className="ds-caption">{o.address || o.phone || '—'}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ============ Image Upload / URL Toggle ============ */}
          <div>
            <label className="ds-label">Product Image</label>

            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setImageMode('upload'); setLocalPreview(null) }}
                className="ds-btn"
                data-variant={imageMode === 'upload' ? 'primary' : 'secondary'}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageMode('url'); setLocalPreview(null) }}
                className="ds-btn"
                data-variant={imageMode === 'url' ? 'primary' : 'secondary'}
              >
                URL
              </button>
            </div>

            {imageMode === 'url' ? (
              (() => {
                const isBackendUrl = formValues.image && (
                  formValues.image.startsWith('http://127.0.0.1:8000') ||
                  formValues.image.startsWith('http://localhost:8000') ||
                  formValues.image.startsWith('https://services.tyb-services.site')
                );
                return isBackendUrl ? (
                  <div>
                    <p className="ds-alert" data-tone="ok">
                      ✅ Gambar sudah tersimpan via upload. Masukkan URL baru jika ingin mengganti.
                    </p>
                    <input
                      key="url-override"
                      type="text"
                      placeholder="https://example.com/image-baru.jpg"
                      value=""
                      onChange={e => handleChange('image', e.target.value)}
                      className="ds-input mt-2"
                    />
                  </div>
                ) : (
                  <input
                    key="url"
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={formValues.image ?? ''}
                    onChange={e => handleChange('image', e.target.value)}
                    className="ds-input"
                  />
                );
              })()
            ) : (
              <div>
                <input
                  key="upload"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  className="ds-input"
                />
                {uploading && (
                  <p className="ds-accent-text text-sm mt-1 animate-pulse">Uploading...</p>
                )}
              </div>
            )}
          </div>

          <h2 className="ds-h2 mt-6">Varian</h2>
          <p className="ds-hint mb-2">
            Tambahkan pilihan varian produk (mis. Ukuran: 250g, Warna: Merah). Baris dengan nama & nilai kosong diabaikan.
          </p>
          {varian.map((v, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nama (mis. Ukuran)"
                value={v.name}
                onChange={e => updateVarian(idx, 'name', e.target.value)}
                className="ds-input"
                style={{ width: '50%' }}
              />
              <input
                type="text"
                placeholder="Nilai (mis. 250g)"
                value={v.value}
                onChange={e => updateVarian(idx, 'value', e.target.value)}
                className="ds-input"
                style={{ width: '50%' }}
              />
              <button
                type="button"
                onClick={() => removeVarian(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded"
                title="Hapus varian"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVarian}
            className="ds-btn"
            data-variant="ghost"
          >
            <Plus size={14} /> Tambah varian
          </button>

          <button
            type="submit"
            className="ds-btn"
            data-variant="primary"
            disabled={uploading}
          >
            Save Product
          </button>
        </form>
      </div>

      {/* ================= RIGHT: IMAGE PREVIEW ================= */}
      <div className="w-1/3 flex flex-col items-center justify-start">
        <div className="sticky top-16 w-full flex flex-col items-center">
          <h2 className="ds-h2 mb-4">Preview</h2>
          <div className="w-72 h-72 rounded-xl flex items-center justify-center overflow-hidden ds-card" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'var(--ds-border-strong)' }}>
            <img
              src={getPreviewSrc()}
              alt="Preview"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
