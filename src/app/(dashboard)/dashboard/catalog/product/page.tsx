'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAllProducts } from '@/graphql/query/catalog/getAllProducts'
import { deleteProductService } from '@/graphql/mutation/catalog/deleteProduct'
import ConfirmModal from '@/components/ConfirmModal'
import { resolveImageUrl } from '@/lib/imageUtils'
import { useActiveStore } from '@/hooks/useActiveStore'
import OutletSelect from '@/components/ui/OutletSelect'

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
  outlets?: { id: number; name: string }[]
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  
  // Pagination and Filter State
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  })

  const [priceFilter, setPriceFilter] = useState({
    minPrice: '',
    maxPrice: '',
  })
  
  const router = useRouter()
  const { stores, activeStoreId, setStore } = useActiveStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeStoreId) fetchProducts(1, keyword)
    }, 500) // Debounce search

    return () => clearTimeout(timer)
  }, [keyword, activeStoreId])

  const fetchProducts = async (targetPage: number, searchKeyword: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')

      if (!activeStoreId) return

      const res = await getAllProducts(token, activeStoreId, searchKeyword, limit, targetPage)
      setProducts(res.getAllProducts.data || [])
      setPagination({
        total: res.getAllProducts.pagination.total,
        totalPages: res.getAllProducts.pagination.total_pages,
      })
      setPage(targetPage)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')
      await deleteProductService(token, id)
      fetchProducts(page, keyword) // Refresh current page
    } catch (err) {
      console.error('Failed to delete product:', err)
      alert("Failed to delete product")
    } finally {
      setConfirmId(null)
    }
  }

  const handleReset = async () => {
    setKeyword('')
    setPriceFilter({
      minPrice: '',
      maxPrice: '',
    })
    fetchProducts(1, '')
  }

  // Price filter is still handled in-memory for responsiveness, or we could move it to server too.
  // Given the current backend only supports 'name', we keep price filter in-memory for now.
  const filteredProducts = products.filter(product => {
    const minPrice = priceFilter.minPrice ? parseFloat(priceFilter.minPrice) : 0
    const maxPrice = priceFilter.maxPrice ? parseFloat(priceFilter.maxPrice) : Infinity
    return product.price >= minPrice && product.price <= maxPrice
  })

  return (
    <div className="pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Products Catalog</h1>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{filteredProducts.length} produk</span>
        <div className="flex flex-wrap gap-2 items-center">
          <OutletSelect stores={stores} value={activeStoreId} onChange={setStore} />
          <Link
            href="/dashboard/catalog/product/import"
            className="px-4 py-2 bg-white border border-blue-600 text-blue-600 font-medium text-sm rounded-lg hover:bg-blue-50 transition shadow-sm"
          >
            + Bulk Import Product
          </Link>
          <Link
            href="/dashboard/catalog/product/create"
            className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            + Create Product
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Search by Name or SKU
          </label>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Type to search..."
              className="border border-gray-200 rounded-xl p-3 w-full pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Min Price
          </label>
          <input
            type="number"
            value={priceFilter.minPrice}
            onChange={e => setPriceFilter(p => ({ ...p, minPrice: e.target.value }))}
            placeholder="0"
            className="border border-gray-200 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Max Price
          </label>
          <input
            type="number"
            value={priceFilter.maxPrice}
            onChange={e => setPriceFilter(p => ({ ...p, maxPrice: e.target.value }))}
            placeholder="100000"
            className="border border-gray-200 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <button
          onClick={handleReset}
          type="button"
          className="bg-gray-50 hover:bg-gray-100 px-6 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 transition"
        >
          Reset
        </button>
      </div>

      {/* PRODUCT LIST - TABLE */}
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
           <p className="text-gray-400 text-lg italic">No products matched your criteria.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-4">Produk</th>
                    <th className="px-5 py-4">SKU</th>
                    <th className="px-5 py-4">Varian</th>
                    <th className="px-5 py-4 text-right">Harga</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/catalog/product/${product.id}/edit`)}
                    >
                      {/* Produk */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            <img
                              src={resolveImageUrl(product.image || '')}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 uppercase leading-tight">{product.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{product.description?.slice(0, 40) || ''}</p>
                            {/* Grouping outlet */}
                            {product.outlets?.length ? (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {product.outlets.slice(0, 3).map(o => (
                                  <span key={o.id} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11.5A3.5 3.5 0 1112 6.5a3.5 3.5 0 010 7z"/></svg>
                                    {o.name}
                                  </span>
                                ))}
                                {product.outlets.length > 3 && (
                                  <span className="text-[10px] text-gray-400">+{product.outlets.length - 3} outlet</span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md">
                          {product.sku}
                        </span>
                      </td>

                      {/* Varian */}
                      <td className="px-5 py-3">
                        {product.attributes?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {product.attributes.slice(0, 3).map((attr, index) => (
                              <span key={index} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                                {attr.name}: {attr.value}
                              </span>
                            ))}
                            {product.attributes.length > 3 && (
                              <span className="text-[11px] text-gray-400">+{product.attributes.length - 3} lagi</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-300 italic">Tidak ada varian</span>
                        )}
                      </td>

                      {/* Harga */}
                      <td className="px-5 py-3 text-right">
                        <span className="font-bold text-gray-800">Rp {product.price.toLocaleString()}</span>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/catalog/product/${product.id}/edit`}
                            onClick={e => e.stopPropagation()}
                            className="p-2 text-gray-400 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(product.id); }}
                            className="p-2 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                            title="Hapus"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="mt-12 flex justify-center items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => fetchProducts(page - 1, keyword)}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchProducts(p, keyword)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                    p === page 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              disabled={page === pagination.totalPages}
              onClick={() => fetchProducts(page + 1, keyword)}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          
          <p className="mt-4 text-center text-sm text-gray-500 font-medium">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} products
          </p>
        </>
      )}

      {/* DELETE MODAL */}
      {confirmId && (
        <ConfirmModal
          title="Delete Product"
          message={
            <div className="text-center">
              <p className="text-gray-600 mb-2">Are you sure you want to delete this product?</p>
              <p className="font-bold text-gray-800 text-lg uppercase truncate">
                {products.find(p => p.id === confirmId)?.name}
              </p>
            </div>
          }
          onCancel={() => setConfirmId(null)}
          onConfirm={() => handleDelete(confirmId)}
        />
      )}
    </div>
  )
}
