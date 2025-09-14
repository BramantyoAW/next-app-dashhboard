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
import { extractStoreId } from '@/lib/jwt'
import { toast } from 'sonner'
import { StockCard } from "@/components/catalog/StockCard"

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<any>({
    sku: '',
    name: '',
    description: '',
    price: 0,
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

        console.log(p)
        setFormData({
          sku: p.sku,
          name: p.name,
          description: p.description,
          price: p.price,
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

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

      console.log(token, storeId)
      if (!token || !storeId) throw new Error('Token/store not found')

      const res = await updateProduct(token, {
        id,
        store_id: String(storeId),
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
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
    <div className="p-6 text-black">
      <h1 className="text-xl font-bold mb-4">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        <div>
          <label className="block text-sm font-medium">SKU</label>
          <input
            type="text"
            value={formData.sku}
            onChange={e => handleChange('sku', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Price</label>
          <input
            type="number"
            value={formData.price}
            onChange={e => handleChange('price', e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        {formData.attributes.map((attr: any, idx: number) => (
          <div key={idx}>
            <label className="block text-sm font-medium">{attr.name}</label>
            <input
              type="text"
              value={attr.value}
              onChange={e => handleAttributeChange(idx, e.target.value)}
              className="w-full border rounded p-2"
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

      <div className="p-6 text-black space-y-8">
      <h1 className="text-xl font-bold mb-4">Edit Product</h1>

      {/* form product */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {/* form field ... */}
      </form>

      {/* stock management */}
      <StockCard productId={Number(id)} />   {/* ⬅️ taruh di bawah form */}
      </div>
    </div>
  )
}

