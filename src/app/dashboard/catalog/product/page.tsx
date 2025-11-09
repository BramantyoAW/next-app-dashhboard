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
  image?: string
  attributes?: Attribute[]
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [filter, setFilter] = useState({
    keyword: '',
    minPrice: '',
    maxPrice: '',
  })
  const router = useRouter()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')

      const storeId = extractStoreId(token)
      if (!storeId) return router.replace('/login')

      const res = await getAllProducts(token, storeId, '', 100, 1)
      setProducts(res.getAllProducts.data || [])
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    setConfirmId(null)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = async () => {
    // Kosongkan filter
    setFilter({
      keyword: '',
      minPrice: '',
      maxPrice: '',
    })
    // Ambil ulang data dari server
    setLoading(true)
    await fetchProducts()
  }

  const filteredProducts = products.filter(product => {
    const keywordMatch =
      !filter.keyword ||
      product.name.toLowerCase().includes(filter.keyword.toLowerCase()) ||
      product.sku.toLowerCase().includes(filter.keyword.toLowerCase())

    const minPrice = filter.minPrice ? parseFloat(filter.minPrice) : 0
    const maxPrice = filter.maxPrice ? parseFloat(filter.maxPrice) : Infinity
    const priceMatch = product.price >= minPrice && product.price <= maxPrice

    return keywordMatch && priceMatch
  })

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex space-x-2">
          <Link
            href="/dashboard/catalog/product/import"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            + Bulk Import Product
          </Link>
          <Link
            href="/dashboard/catalog/product/create"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            + Create Product
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Search by Name or SKU
          </label>
          <input
            type="text"
            value={filter.keyword}
            onChange={e => handleFilterChange('keyword', e.target.value)}
            placeholder="Search..."
            className="border rounded p-2 w-full"
          />
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Min Price
          </label>
          <input
            type="number"
            value={filter.minPrice}
            onChange={e => handleFilterChange('minPrice', e.target.value)}
            placeholder="0"
            className="border rounded p-2 w-full"
          />
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Max Price
          </label>
          <input
            type="number"
            value={filter.maxPrice}
            onChange={e => handleFilterChange('maxPrice', e.target.value)}
            placeholder="100000"
            className="border rounded p-2 w-full"
          />
        </div>

        <button
          onClick={handleReset}
          type="button"
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm font-medium border border-gray-300"
        >
          Reset
        </button>
      </div>

      {/* PRODUCT LIST */}
      {loading ? (
        <p className="text-gray-500">Loading products...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex items-center justify-between"
            >
              {/* LEFT: product info */}
              <div className="flex-1 pr-4">
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

                <div className="mt-3 flex space-x-2">
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

              {/* RIGHT: product image thumbnail */}
              <div className="w-[120px] h-[120px] flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-gray-400 text-xs text-center px-2">
                    No image
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DELETE MODAL */}
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
