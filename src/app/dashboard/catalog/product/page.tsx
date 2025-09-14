'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAllProducts } from '@/graphql/query/catalog/getAllProducts'
import ConfirmModal from '@/components/ConfirmModal'
import { extractStoreId } from '@/lib/jwt'

interface Attribute {
  name: string
  value: string
}

interface Product {
  id: number
  sku: string
  name: string
  price: number
  description?: string
  attributes?: Attribute[]
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)
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
        const res = await getAllProducts(token, storeId, '', 10, 1)
        setProducts(res.getAllProducts.data || [])
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [router])

  const handleDelete = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    // TODO: call deleteProductService(id)
    setConfirmId(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex space-x-2">
          <Link
            href="/dashboard/catalog/product/import"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            + Import Product
          </Link>
          <Link
            href="/dashboard/catalog/product/create"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            + Create Product
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading products...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow p-4 hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
                <p className="text-xs text-gray-500">SKU: {product.sku}</p>

                <p className="mt-2 text-sm text-gray-500">Price:</p>
                <p className="text-blue-600 font-semibold text-lg">
                  Rp {product.price.toLocaleString()}
                </p>

                {product.attributes?.length ? (
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    {product.attributes.map((attr, index) => (
                      <li key={index}>
                        {attr.name}: {attr.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="mt-4 flex space-x-2">
                <Link
                  href={`/dashboard/catalog/product/${product.id}/edit`}
                  className="text-sm px-3 py-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setConfirmId(product.id)}
                  className="text-sm px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          title="Konfirmasi Hapus"
          message={
            <p>
              Apakah kamu yakin ingin menghapus product{' '}
              <span className="font-semibold">
                {products.find(p => p.id === confirmId)?.name}
              </span>
              ?
            </p>
          }
          onCancel={() => setConfirmId(null)}
          onConfirm={() => handleDelete(confirmId)}
        />
      )}
    </div>
  )
}
