'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { createProduct } from '@/graphql/mutation/catalog/createProduct'
import { uploadProductImage } from '@/graphql/mutation/catalog/uploadProductImage'
import { extractStoreId } from '@/lib/jwt'
import { toast } from 'sonner'

type Attribute = { id: number | string; name: string; type: string }

export default function CreateProductPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({
    sku: '',
    name: '',
    description: '',
    price: '0',
    image: '',
  })
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url')
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')
      const storeId = extractStoreId(token)
      if (!storeId) return router.replace('/login')

      try {
        const res = await getAllAttribute(token, storeId)
        const attrs = res?.getAllAttribute?.data || []
        setAttributes(attrs)

        const defaults: Record<string, string> = {
          sku: '',
          name: '',
          description: '',
          price: '',
          image: '',
        }
        attrs.forEach(attr => {
          defaults[attr.name] = ''
        })
        setFormValues(defaults)
      } catch (err) {
        console.error('Failed to fetch attributes:', err)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [router])

  const handleChange = (name: string, value: string) =>
    setFormValues(prev => ({ ...prev, [name]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const storeId = extractStoreId(token)
      if (!token || !storeId) return

      const { sku, name, description, price, image, ...attrValues } = formValues
      const attrsInput = attributes.map(attr => ({
        attribute_id: Number(attr.id),
        value: attrValues[attr.name] || '',
      }))

      const res = await createProduct(
        token,
        storeId,
        sku,
        name,
        description,
        Number(price),
        attrsInput,
        image || undefined
      )

      toast.success(`Product "${res.createProduct.name}" berhasil ditambahkan!`)
      router.push('/dashboard/catalog/product')
    } catch (err) {
      console.error('Failed to create product:', err)
      toast.error('Gagal menambahkan product')
    }
  }

  if (loading) return <p>Loading attributes...</p>

  return (
    <div className="flex p-8 gap-8 bg-gray-50 min-h-screen">
      {/* ================= LEFT: FORM ================= */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Create Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
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

          {/* ============ Image Upload / URL Toggle ============ */}
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
                value={formValues.image ?? ''}
                onChange={e => handleChange('image', e.target.value)}
                className="border rounded p-2 w-full"
              />
            ) : (
              <input
                key="upload"
                type="file"
                accept="image/*"
                onChange={async e => { /* upload logic */ }}
                className="border rounded p-2 w-full"
              />
            )}
          </div>

          <h2 className="text-lg font-semibold mt-6">Attributes</h2>
          {attributes.map(attr => (
            <div key={attr.id}>
              <label className="font-medium mb-1 block">{attr.name}</label>
              <input
                type="text"
                value={formValues[attr.name] ?? ''}
                onChange={e => handleChange(attr.name, e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          ))}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
            {formValues.image ? (
              <img
                src={formValues.image}
                alt="Preview"
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
