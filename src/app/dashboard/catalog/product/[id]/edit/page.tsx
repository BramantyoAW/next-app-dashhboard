"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { graphqlClient } from "@/graphql/graphqlClient"
import {
  GET_PRODUCT_BY_ID,
  GetProductByIdResponse,
  Product,
} from "@/graphql/query/catalog/getProductById"
import { updateProduct } from "@/graphql/mutation/catalog/updateProduct"
import { toast } from "sonner"

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  // form state
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    price: 0,
    attributes: [],
  })

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) throw new Error("Token not found")

        graphqlClient.setHeader("Authorization", `Bearer ${token}`)

        const res = await graphqlClient.request<GetProductByIdResponse>(
          GET_PRODUCT_BY_ID,
          { id }
        )

        setProduct(res.getProductById)
        setFormData({
          name: res.getProductById.name,
          description: res.getProductById.description,
          price: res.getProductById.price,
          attributes: res.getProductById.attributes.map((a, idx) => ({
            attribute_id: String(idx + 1), // ⚠️ disesuaikan dengan schema kamu
            name: a.name,
            value: a.value,
          })),
        })
      } catch (err) {
        console.error("Failed to fetch product:", err)
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
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Token not found")

      const res = await updateProduct(token, {
        id,
        store_id: "1", // bisa dibuat dinamis juga
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        attributes: formData.attributes.map((a: any) => ({
          attribute_id: a.attribute_id,
          value: a.value,
        })),
      })

      toast.success(`Product "${res.updateProduct.name}" berhasil diupdate!`)
      router.push("/dashboard/catalog/product")
    } catch (err) {
      console.error("Failed to update product:", err)
      toast.error("Gagal menyimpan perubahan")
    }
  }

  if (loading) return <p>Loading...</p>
  if (!product) return <p>Product not found</p>

  return (
    <div className="p-6 opacity-100 text-black">
      <h1 className="text-xl font-bold mb-4">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Price</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        {formData.attributes.map((attr: any, idx: number) => (
          <div key={idx}>
            <label className="block text-sm font-medium">{attr.name}</label>
            <input
              type="text"
              value={attr.value}
              onChange={(e) => handleAttributeChange(idx, e.target.value)}
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
    </div>
  )
}
