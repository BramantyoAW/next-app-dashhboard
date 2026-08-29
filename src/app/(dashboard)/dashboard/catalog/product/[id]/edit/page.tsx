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
import { getActiveStoreId } from '@/lib/jwt'
import { resolveImageUrl } from '@/lib/imageUtils'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'
import { VariantStockManager } from '@/components/catalog/VariantStockManager'
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

      const res = await updateProduct(token, {
        id,
        store_id: String(storeId),
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
            Produk ber-varian stoknya dikelola per-varian di bawah. */}
        {formData.attributes?.filter((a: any) => a?.name || a?.value).length === 0 && (
          <div className="mt-10">
            <StockCard productId={Number(id)} />
          </div>
        )}

        {/* STOK & GAMBAR PER VARIAN (utk produk ber-varian) */}
        <VariantStockManager productId={Number(id)} attributes={formData.attributes || []} />

        {/* STOCK HISTORY (produk + varian) */}
        <StockHistory productId={Number(id)} />

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
