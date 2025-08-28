'use client'

import React, { useEffect, useState } from 'react'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { createProduct } from '@/graphql/mutation/catalog/createproduct'
import { useProfile } from '@/app/dashboard/layout'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

type Attribute = {
  id: number | string
  name: string
  type: string
}

export default function CreateProductPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({
    name: '',
    description: '',
    price: '0',
  })
  const profile = useProfile()
  const router = useRouter()

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const token = localStorage.getItem('token')
        const storeId = profile?.me?.user?.store_id
  
        if (!token || !storeId) {
          console.error('Token / StoreId missing')
          return
        }
  
        const res = await getAllAttribute(token, Number(storeId))
        const attrs = res?.getAllAttribute?.data || []
        setAttributes(attrs)
  
        const defaults: Record<string, string> = {
          name: '',
          description: '',
          price: '',
        }
        attrs.forEach((attr: Attribute) => {
          defaults[attr.name] = ''
        })
        setFormValues(defaults)
      } catch (err) {
        console.error('Failed to fetch attributes:', err)
      } finally {
        setLoading(false)
      }
    }
  
    fetchAttributes()
  }, [profile])
  

  const handleChange = (name: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const storeId = profile?.me?.user?.store_id

      if (!token || !storeId) {
        console.error('Token / StoreId missing')
        return
      }

      const { name, description, price, ...attrValues } = formValues
      const attrsInput = attributes.map((attr) => ({
        attribute_id: Number(attr.id),
        value: attrValues[attr.name] || '',
      }))

      const res = await createProduct(
        token,
        Number(storeId),
        name,
        description,
        Number(price),
        attrsInput
      )

      // popup
      toast.success(`Product "${res.createProduct.name}" berhasil ditambahkan!`)

      // redirect ke list product
      router.push('/dashboard/catalog/product')
    } catch (err) {
      console.error('Failed to create product:', err)
      toast.error('Gagal menambahkan product')
    }
  }

  if (loading) {
    return <p className="p-4">Loading attributes...</p>
  }

  return (
    <div className="p-6 opacity-100 text-black">
      <h1 className="text-2xl font-bold mb-6">Create Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {/* Mandatory fields */}
        <div className="flex flex-col">
          <label className="font-medium mb-1">Name</label>
          <input
            type="text"
            value={formValues.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="border rounded p-2"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="font-medium mb-1">Description</label>
          <textarea
            value={formValues.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="border rounded p-2"
            rows={3}
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="font-medium mb-1">Price</label>
          <input
            type="number"
            value={formValues.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="border rounded p-2"
            required
          />
        </div>

        {/* Dynamic attributes */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Attributes</h2>
          <div className="space-y-4">
            {attributes.map((attr) => (
              <div key={attr.id} className="flex flex-col">
                <label className="font-medium mb-1">{attr.name}</label>
                <input
                  type="text"
                  value={formValues[attr.name] ?? ''}
                  onChange={(e) => handleChange(attr.name, e.target.value)}
                  className="border rounded p-2"
                />
              </div>
            ))}
          </div>
        </div>

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
