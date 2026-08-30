'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { graphqlClient } from '@/graphql/graphqlClient'
import {
  GET_PRODUCT_BY_ID,
  GetProductByIdResponse,
  Product,
} from '@/graphql/query/catalog/getProductById'
import { updateProduct } from '@/graphql/mutation/catalog/updateProduct'
import { uploadProductImage } from '@/graphql/mutation/catalog/uploadProductImage'
import { myStoresService, MyStore } from '@/graphql/query/myStores'
import { getActiveStoreId } from '@/lib/jwt'
import { resolveImageUrl } from '@/lib/imageUtils'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'
import { VariantStockManager } from '@/components/catalog/VariantStockManager'
import { OutletSelect } from '@/components/catalog/OutletSelect'
import { StockHistory } from '@/components/catalog/StockHistory'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('upload')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState<any>({
    sku: '',
    name: '',
    description: '',
    price: 0,
    image: '',
    attributes: [],
  })

  // === Multi-outlet (feedback #1): daftar merchant/outlet produk + updatable ===
  const [outlets, setOutlets] = useState<MyStore[]>([])
  const [selectedOutlets, setSelectedOutlets] = useState<number[]>([])
  // Outlet tujuan EDIT STOK — select terpisah dari checkbox, biar tidak ambigu.
  const [stockOutletId, setStockOutletId] = useState<number | null>(null)
  // Bump utk memaksa StockHistory re-fetch setelah Simpan stok.
  const [historyVersion, setHistoryVersion] = useState(0)

  // Load daftar outlet milik user (untuk checkbox).
  useEffect(() => {
    async function loadOutlets() {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await myStoresService(token)
        setOutlets(res.myStores || [])
      } catch (e) {
        console.error('Failed to load outlets:', e)
      }
    }
    loadOutlets()
  }, [])

  useEffect(() => {
    async function fetchProduct() {
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Token not found')
        graphqlClient.setHeader('Authorization', `Bearer ${token}`)

        const res = await graphqlClient.request<GetProductByIdResponse>(
          GET_PRODUCT_BY_ID,
          { id }
        )

        const p = res.getProductById
        setProduct(p)

        const attrs = Array.isArray(p.attributes)
          ? p.attributes.map((a: any) => ({ name: a.name ?? '', value: a.value ?? '' }))
          : []

        setFormData({
          sku: p.sku,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image || '',
          attributes: attrs,
        })

        // Outlet aktif = store_products dengan is_active=true.
        const activeStores = (p.store_products || [])
          .filter((sp: any) => sp?.is_active)
          .map((sp: any) => Number(sp.store_id))
        setSelectedOutlets(activeStores)
        // Outlet tujuan edit stok: default outlet aktif pertama.
        setStockOutletId(prev => prev ?? activeStores[0] ?? null)
      } catch (err) {
        console.error('Failed to fetch product:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchProduct()
  }, [id])

  const handleChange = (field: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [field]: value }))

  const toggleOutlet = (id: number) =>
    setSelectedOutlets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  /** Refresh daftar outlet aktif dari BE (dipakai setelah ubah stok, supaya
      is_active store_products ikut sinkron). */
  const reloadOutletStocks = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      graphqlClient.setHeader('Authorization', `Bearer ${token}`)
      const res = await graphqlClient.request<GetProductByIdResponse>(GET_PRODUCT_BY_ID, { id })
      const p = res.getProductById
      const activeStores = (p.store_products || [])
        .filter((sp: any) => sp?.is_active)
        .map((sp: any) => Number(sp.store_id))
      if (activeStores.length > 0) setSelectedOutlets(activeStores)
      // Jaga agar outlet edit stok tetap valid (masih aktif).
      setStockOutletId(prev => {
        if (prev == null) return activeStores[0] ?? null
        return activeStores.includes(prev) ? prev : activeStores[0] ?? null
      })
      setHistoryVersion(v => v + 1)
    } catch (e) {
      console.error('Failed to reload outlets:', e)
    }
  }

  const handleAttributeChange = (index: number, field: 'name' | 'value', value: string) => {
    const newAttrs = [...formData.attributes]
    newAttrs[index] = { ...newAttrs[index], [field]: value }
    setFormData((prev: any) => ({ ...prev, attributes: newAttrs }))
  }
  const addAttribute = () =>
    setFormData((prev: any) => ({ ...prev, attributes: [...prev.attributes, { name: '', value: '' }] }))
  const removeAttribute = (index: number) =>
    setFormData((prev: any) => ({ ...prev, attributes: prev.attributes.filter((_: any, i: number) => i !== index) }))

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
    if (message.includes('Duplicate entry') && message.includes('sku_unique')) {
      return 'SKU sudah digunakan. Gunakan SKU yang berbeda.'
    }
    if (message.includes('Duplicate entry')) {
      return 'Data sudah ada di database. Periksa kembali SKU dan nama product.'
    }
    const validation = err?.response?.errors?.[0]?.extensions?.validation
    if (validation) {
      const messages = Object.values(validation).flat() as string[]
      if (messages.length > 0) return messages[0].replace(/\(Connection:.*\)$/, '').trim()
    }
    return 'Gagal menyimpan perubahan. Periksa kembali data yang diinput.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const token = localStorage.getItem('token')
      const storeId = getActiveStoreId(token)
      if (!token || !storeId) throw new Error('Token/store not found')

      if (selectedOutlets.length === 0) {
        setFormError('Pilih minimal 1 outlet (merchant) untuk produk ini.')
        toast.error('Pilih minimal 1 outlet')
        return
      }

      const res = await updateProduct(token, {
        id,
        store_id: String(storeId),
        store_ids: selectedOutlets.length > 0 ? selectedOutlets : undefined,
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        image: formData.image || undefined,
        // Baris kosong diabaikan — jangan kirim atribut tak lengkap yang bisa
        // menimpa definisi varian & membuat kombinasi (price/stock/image) "hilang".
        attributes: formData.attributes
          .filter((a: any) => a?.name?.trim() && a?.value?.trim())
          .map((a: any) => ({ name: a.name.trim(), value: a.value.trim() })),
      })

      toast.success(`Product "${res.updateProduct.name}" berhasil diupdate!`)
      router.push('/dashboard/catalog/product')
    } catch (err: any) {
      console.error('Failed to update product:', err)
      const errorMsg = parseProductError(err)
      setFormError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // Determine preview image
  const getPreviewSrc = (): string => {
    if (localPreview) return localPreview
    return resolveImageUrl(formData.image)
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  if (loading) return <p>Loading...</p>
  if (!product) return <p>Product not found</p>

  return (
    <div className="flex p-8 gap-8 bg-gray-50 min-h-screen">
      {/* LEFT: FORM */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

        <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="font-medium mb-1 block">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={e => handleChange('sku', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Description</label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="border rounded p-2 w-full"
              rows={3}
            />
          </div>

          <div>
            <label className="font-medium mb-1 block">Price</label>
            <input
              type="number"
              value={formData.price}
              onChange={e => handleChange('price', e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>

          {/* IMAGE */}
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
                // Don't show backend URLs in the field for security
                const isBackendUrl = formData.image && (
                  formData.image.startsWith('http://127.0.0.1:8000') ||
                  formData.image.startsWith('http://localhost:8000') ||
                  formData.image.startsWith('https://services.tyb-services.site')
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
                    value={formData.image ?? ''}
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
                {formData.image && !localPreview && (
                  <p className="text-xs text-gray-400 mt-1">Gambar tersimpan. Upload file baru untuk mengganti.</p>
                )}
              </div>
            )}
          </div>

          {/* MULTI-OUTLET (feedback #1): daftar merchant/outlet + updatable */}
          <div className="border-t pt-4 mt-4">
            <label className="font-medium mb-1 block">
              Merchant / Outlet <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Produk ini dijual di outlet mana? Uncheck outlet → produk tidak lagi dijual di outlet itu (tetap tersimpan datanya).
            </p>
            {outlets.length === 0 ? (
              <p className="text-xs text-gray-400">Memuat outlet...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {outlets.map(o => (
                  <label
                    key={o.id}
                    className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      selectedOutlets.includes(Number(o.id))
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOutlets.includes(Number(o.id))}
                      onChange={() => toggleOutlet(Number(o.id))}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm font-medium truncate">{o.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* VARIAN */}
          <h2 className="text-lg font-semibold mt-6">Varian</h2>
          <p className="text-xs text-gray-500 mb-2">
            Tambah pilihan varian (mis. baris "Ukuran / 250g" dan "Ukuran / 500g" = dua opsi ukuran). Baris kosong diabaikan saat simpan.
          </p>
          {formData.attributes.map((attr: any, idx: number) => (
            <div key={idx} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                placeholder="Nama (mis. Ukuran)"
                value={attr.name ?? ''}
                onChange={e => handleAttributeChange(idx, 'name', e.target.value)}
                className="border rounded p-2 w-1/2"
              />
              <input
                type="text"
                placeholder="Nilai (mis. 250g)"
                value={attr.value ?? ''}
                onChange={e => handleAttributeChange(idx, 'value', e.target.value)}
                className="border rounded p-2 w-1/2"
              />
              <button
                type="button"
                onClick={() => removeAttribute(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded"
                title="Hapus varian"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAttribute}
            className="flex items-center gap-1 text-blue-600 text-sm hover:underline"
          >
            + Tambah variasi
          </button>
        </form>

        {/* STOK PARENT — HANYA utk produk TANPA varian.
            Produk ber-varian stoknya dikelola per-varian di bawah.
            Stok diedit di outlet yang DIPILIH via select (stockOutletId),
            terpisah dari checkbox Merchant/Outlet (toggle aktif/nonaktif). */}
        {formData.attributes?.filter((a: any) => a?.name || a?.value).length === 0 && (
          <div className="mt-10">
            <OutletSelect
              outlets={outlets}
              value={stockOutletId}
              onChange={setStockOutletId}
              label="Edit Stok di Outlet"
            />
            <StockCard
              productId={Number(id)}
              storeId={stockOutletId ?? undefined}
              storeName={outlets.find(o => Number(o.id) === Number(stockOutletId))?.name ?? null}
              onSuccess={reloadOutletStocks}
            />
          </div>
        )}

        {/* STOK & GAMBAR PER VARIAN (utk produk ber-varian) */}
        <VariantStockManager
          productId={Number(id)}
          attributes={formData.attributes || []}
          storeId={stockOutletId}
          storeName={outlets.find(o => Number(o.id) === Number(stockOutletId))?.name ?? null}
          onSaved={reloadOutletStocks}
          outlets={outlets}
          onOutletChange={setStockOutletId}
        />

        {/* STOCK HISTORY (produk + varian) */}
        <StockHistory key={historyVersion} productId={Number(id)} />

        {/* TOMBOL SAVE DI PALING BAWAH */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            form="product-edit-form"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 shadow transition font-semibold"
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* RIGHT: IMAGE PREVIEW */}
      <div className="w-1/3 flex flex-col items-center justify-start">
        <div className="sticky top-16 w-full flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="w-72 h-72 border-2 border-dashed rounded-xl flex items-center justify-center bg-white overflow-hidden shadow">
            <img
              src={getPreviewSrc()}
              alt={formData.name}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
