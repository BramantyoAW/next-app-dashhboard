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
import { extractStoreId } from '@/lib/jwt'
import { toast } from 'sonner'
import { StockCard } from '@/components/catalog/StockCard'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url')

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

        setFormData({
          sku: p.sku,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image || '',
          attributes: p.attributes.map(a => ({
            attribute_id: a.id,
            name: a.name,
            value: a.value,
          })),
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

  const handleAttributeChange = (index: number, value: string) => {
    const newAttrs = [...formData.attributes]
    newAttrs[index].value = value
    setFormData((prev: any) => ({ ...prev, attributes: newAttrs }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const storeId = extractStoreId(token)
      if (!token || !storeId) throw new Error('Token/store not found')

      const res = await updateProduct(token, {
        id,
        store_id: String(storeId),
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        image: formData.image || undefined,
        attributes: formData.attributes.map((a: any) => ({
          attribute_id: a.attribute_id,
          value: a.value,
        })),
      })

      toast.success(`Product "${res.updateProduct.name}" berhasil diupdate!`)
      router.push('/dashboard/catalog/product')
    } catch (err) {
      console.error('Failed to update product:', err)
      toast.error('Gagal menyimpan perubahan')
    }
  }

  if (loading) return <p>Loading...</p>
  if (!product) return <p>Product not found</p>

  return (
    <div className="flex p-8 gap-8 bg-gray-50 min-h-screen">
      {/* LEFT: FORM */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
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
                onClick={() => setImageMode('url')}
                className={`px-3 py-1 border rounded ${
                  imageMode === 'url' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`px-3 py-1 border rounded ${
                  imageMode === 'upload' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                Upload
              </button>
            </div>

            {imageMode === 'url' ? (
              <input
                key="url"
                type="text"
                placeholder="https://example.com/image.jpg"
                value={formData.image ?? ''}
                onChange={e => handleChange('image', e.target.value)}
                className="border rounded p-2 w-full"
              />
            ) : (
              <input
                key="upload"
                type="file"
                accept="image/*"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  const token = localStorage.getItem('token')
                  if (!token) {
                    toast.error('Not logged in')
                    return
                  }

                  try {
                    const imageUrl = await uploadProductImage(token, file)
                    handleChange('image', imageUrl)
                    toast.success('Image uploaded successfully')
                  } catch (err) {
                    console.error('Upload error:', err)
                    toast.error('Upload failed')
                  }
                }}
                className="border rounded p-2 w-full"
              />
            )}

          </div>

          {/* ATTRIBUTES */}
          <h2 className="text-lg font-semibold mt-6">Attributes</h2>
          {formData.attributes.map((attr: any, idx: number) => (
            <div key={idx}>
              <label className="font-medium mb-1 block">{attr.name}</label>
              <input
                type="text"
                value={attr.value ?? ''}
                onChange={e => handleAttributeChange(idx, e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          ))}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>

        {/* STOCK SECTION */}
        <div className="mt-10">
          <StockCard productId={Number(id)} />
        </div>
      </div>

      {/* RIGHT: IMAGE PREVIEW */}
      <div className="w-1/3 flex flex-col items-center justify-start">
        <div className="sticky top-16 w-full flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="w-72 h-72 border-2 border-dashed rounded-xl flex items-center justify-center bg-white overflow-hidden shadow">
            {formData.image ? (
              <img
                src={formData.image}
                alt={formData.name}
                className="object-cover w-full h-full"
              />
            ) : (
              <p className="text-gray-400 text-sm">No image selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
