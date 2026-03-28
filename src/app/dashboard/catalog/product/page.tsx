'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAllProducts } from '@/graphql/query/catalog/getAllProducts'
import { deleteProductService } from '@/graphql/mutation/catalog/deleteProduct'
import ConfirmModal from '@/components/ConfirmModal'
import { extractStoreId } from '@/lib/jwt'
import { resolveImageUrl } from '@/lib/imageUtils'

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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, keyword)
    }, 500) // Debounce search

    return () => clearTimeout(timer)
  }, [keyword])

  const fetchProducts = async (targetPage: number, searchKeyword: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return router.replace('/login')

      const storeId = extractStoreId(token)
      if (!storeId) return router.replace('/login')

      const res = await getAllProducts(token, storeId, searchKeyword, limit, targetPage)
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
        <div className="flex flex-wrap gap-2">
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

      {/* PRODUCT LIST - GRID LIST */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
              >
                {/* Product Image */}
                <div className="aspect-square relative overflow-hidden bg-gray-50 border-b border-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/catalog/product/${product.id}/edit`)}>
                  <img
                    src={resolveImageUrl(product.image)}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmId(product.id); }}
                        className="p-2 bg-white/90 backdrop-blur rounded-full text-red-600 shadow-lg hover:bg-red-50"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">{product.sku}</p>
                  <h2 className="text-base font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors uppercase">
                    {product.name}
                  </h2>
                  
                  {product.attributes?.length ? (
                    <div className="mt-2 space-y-1">
                      {product.attributes.slice(0, 2).map((attr, index) => (
                        <div key={index} className="flex text-[11px] text-gray-500">
                          <span className="font-medium mr-1">{attr.name}:</span>
                          <span className="truncate">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-8"></div> // spacer
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                    <div className="text-blue-600 font-bold text-lg">
                      Rp {product.price.toLocaleString()}
                    </div>
                    <Link
                      href={`/dashboard/catalog/product/${product.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
