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
    <div className="flex p-8 gap-8 bg-gray-50 min-h-screen">
      {/* ================= LEFT: FORM ================= */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Create Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="font-medium mb-1 block">SKU</label>
            <input
              type="text"
              value={formValues.sku}
              onChange={e => handleChange('sku', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Name</label>
            <input
              type="text"
              value={formValues.name}
              onChange={e => handleChange('name', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Description</label>
            <textarea
              value={formValues.description}
              onChange={e => handleChange('description', e.target.value)}
              className="border rounded p-2 w-full"
              rows={3}
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Price</label>
            <input
              type="number"
              value={formValues.price}
              onChange={e => handleChange('price', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          {/* ============ Pilih Outlet (multi-outlet) ============ */}
          <div>
            <label className="font-medium mb-1 block flex items-center gap-2">
              <Store size={16} /> Pilih Outlet / Merchant
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Produk akan dibuat di outlet yang dipilih (stok 0 tiap outlet, diatur nanti di Inventory).
            </p>
            {outlets.length === 0 ? (
              <p className="text-sm text-gray-400">Memuat outlet...</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {outlets.map(o => (
                  <label
                    key={o.id}
                    className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedOutlets.includes(o.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOutlets.includes(o.id)}
                      onChange={() => toggleOutlet(o.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{o.name}</p>
                      <p className="text-[11px] text-slate-400">{o.address || o.phone || '—'}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ============ Image Upload / URL Toggle ============ */}
          <div>
            <label className="font-medium mb-1 block">Product Image</label>

            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setImageMode('upload'); setLocalPreview(null) }}
                className={`px-3 py-1 border rounded ${
                  imageMode === 'upload' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageMode('url'); setLocalPreview(null) }}
                className={`px-3 py-1 border rounded ${
                  imageMode === 'url' ? 'bg-blue-600 text-white' : ''
                }`}
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
                    <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
                      ✅ Gambar sudah tersimpan via upload. Masukkan URL baru jika ingin mengganti.
                    </p>
                    <input
                      key="url-override"
                      type="text"
                      placeholder="https://example.com/image-baru.jpg"
                      value=""
                      onChange={e => handleChange('image', e.target.value)}
                      className="border rounded p-2 w-full mt-2"
                    />
                  </div>
                ) : (
                  <input
                    key="url"
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={formValues.image ?? ''}
                    onChange={e => handleChange('image', e.target.value)}
                    className="border rounded p-2 w-full"
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
                  className="border rounded p-2 w-full"
                />
                {uploading && (
                  <p className="text-sm text-blue-600 mt-1 animate-pulse">Uploading...</p>
                )}
              </div>
            )}
          </div>

          <h2 className="text-lg font-semibold mt-6">Varian</h2>
          <p className="text-xs text-gray-500 mb-2">
            Tambahkan pilihan varian produk (mis. Ukuran: 250g, Warna: Merah). Baris dengan nama & nilai kosong diabaikan.
          </p>
          {varian.map((v, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nama (mis. Ukuran)"
                value={v.name}
                onChange={e => updateVarian(idx, 'name', e.target.value)}
                className="border rounded p-2 w-1/2"
              />
              <input
                type="text"
                placeholder="Nilai (mis. 250g)"
                value={v.value}
                onChange={e => updateVarian(idx, 'value', e.target.value)}
                className="border rounded p-2 w-1/2"
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
            className="flex items-center gap-1 text-blue-600 text-sm hover:underline mt-1"
          >
            <Plus size={14} /> Tambah varian
          </button>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={uploading}
          >
            Save Product
          </button>
        </form>
      </div>

      {/* ================= RIGHT: IMAGE PREVIEW ================= */}
      <div className="w-1/3 flex flex-col items-center justify-start">
        <div className="sticky top-16 w-full flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="w-72 h-72 border-2 border-dashed rounded-xl flex items-center justify-center bg-white overflow-hidden shadow">
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
