'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { createProduct } from '@/graphql/mutation/catalog/createproduct'
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
  })
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('token')
      if (!token) {
        router.replace('/login')
        return
      }
      const storeId = extractStoreId(token)
      if (!storeId) {
        router.replace('/login')
        return
      }

      try {
        const res = await getAllAttribute(token, storeId)
        const attrs = res?.getAllAttribute?.data || []
        setAttributes(attrs)

        const defaults: Record<string, string> = {
          sku: '',
          name: '',
          description: '',
          price: '',
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

  const handleChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const storeId = extractStoreId(token)
      if (!token || !storeId) return

      const { sku, name, description, price, ...attrValues } = formValues
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
        attrsInput
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
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-6">Create Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        <div>
          <label className="font-medium mb-1">SKU</label>
          <input
            type="text"
            value={formValues.sku}
            onChange={e => handleChange('sku', e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="font-medium mb-1">Name</label>
          <input
            type="text"
            value={formValues.name}
            onChange={e => handleChange('name', e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="font-medium mb-1">Description</label>
          <textarea
            value={formValues.description}
            onChange={e => handleChange('description', e.target.value)}
            className="border rounded p-2 w-full"
            rows={3}
          />
        </div>
        <div>
          <label className="font-medium mb-1">Price</label>
          <input
            type="number"
            value={formValues.price}
            onChange={e => handleChange('price', e.target.value)}
            className="border rounded p-2 w-full"
            required
          />
        </div>

        <h2 className="text-lg font-semibold mt-6">Attributes</h2>
        {attributes.map(attr => (
          <div key={attr.id}>
            <label className="font-medium mb-1">{attr.name}</label>
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
  )
}
