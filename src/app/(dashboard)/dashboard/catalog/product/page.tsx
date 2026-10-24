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
      <div className="ds-page-head mb-6">
        <h1 className="ds-display">Products Catalog</h1>
        <span className="ds-badge">{filteredProducts.length} produk</span>
        <div className="flex flex-wrap gap-2 items-center">
          <OutletSelect stores={stores} value={activeStoreId} onChange={setStore} />
          <Link
            href="/dashboard/catalog/product/import"
            className="ds-btn"
            data-variant="secondary"
          >
            + Bulk Import Product
          </Link>
          <Link
            href="/dashboard/catalog/product/create"
            className="ds-btn"
            data-variant="primary"
          >
            + Create Product
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="ds-card ds-card-pad mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="ds-label">
            Search by Name or SKU
          </label>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Type to search..."
              className="ds-input"
              style={{ paddingLeft: 36 }}
            />
            <svg className="w-5 h-5 ds-icon-muted absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="w-40">
          <label className="ds-label">
            Min Price
          </label>
          <input
            type="number"
            value={priceFilter.minPrice}
            onChange={e => setPriceFilter(p => ({ ...p, minPrice: e.target.value }))}
            placeholder="0"
            className="ds-input"
          />
        </div>

        <div className="w-40">
          <label className="ds-label">
            Max Price
          </label>
          <input
            type="number"
            value={priceFilter.maxPrice}
            onChange={e => setPriceFilter(p => ({ ...p, maxPrice: e.target.value }))}
            placeholder="100000"
            className="ds-input"
          />
        </div>

        <button
          onClick={handleReset}
          type="button"
          className="ds-btn"
          data-variant="secondary"
        >
          Reset
        </button>
      </div>

      {/* PRODUCT LIST - TABLE */}
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--ds-primary)' }}></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="ds-empty">
           <p className="ds-small italic">No products matched your criteria.</p>
        </div>
      ) : (
        <>
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Varian</th>
                    <th style={{ textAlign: 'right' }}>Harga</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/catalog/product/${product.id}/edit`)}
                    >
                      {/* Produk */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}>
                            <img
                              src={resolveImageUrl(product.image || '')}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="ds-body uppercase leading-tight" style={{ fontWeight: 600 }}>{product.name}</p>
                            <p className="ds-caption mt-0.5">{product.description?.slice(0, 40) || ''}</p>
                            {/* Grouping outlet */}
                            {product.outlets?.length ? (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {product.outlets.slice(0, 3).map(o => (
                                  <span key={o.id} className="ds-badge" data-tone="info">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11.5A3.5 3.5 0 1112 6.5a3.5 3.5 0 010 7z"/></svg>
                                    {o.name}
                                  </span>
                                ))}
                                {product.outlets.length > 3 && (
                                  <span className="ds-caption">+{product.outlets.length - 3} outlet</span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td>
                        <span className="ds-chip ds-mono">
                          {product.sku}
                        </span>
                      </td>

                      {/* Varian */}
                      <td>
                        {product.attributes?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {product.attributes.slice(0, 3).map((attr, index) => (
                              <span key={index} className="ds-chip">
                                {attr.name}: {attr.value}
                              </span>
                            ))}
                            {product.attributes.length > 3 && (
                              <span className="ds-caption">+{product.attributes.length - 3} lagi</span>
                            )}
                          </div>
                        ) : (
                          <span className="ds-caption italic">Tidak ada varian</span>
                        )}
                      </td>

                      {/* Harga */}
                      <td className="text-right">
                        <span className="ds-num" style={{ fontWeight: 600 }}>Rp {product.price.toLocaleString()}</span>
                      </td>

                      {/* Aksi */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/catalog/product/${product.id}/edit`}
                            onClick={e => e.stopPropagation()}
                            className="ds-btn"
                            data-variant="ghost"
                            style={{ width: 32, padding: 0 }}
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(product.id); }}
                            className="ds-btn"
                            data-variant="ghost"
                            style={{ width: 32, padding: 0, color: 'var(--ds-danger)' }}
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
              className="ds-btn"
              data-variant="secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchProducts(p, keyword)}
                  className="ds-btn-sm min-w-[30px]"
                  {...(p === page ? {} : { 'data-tone': 'neutral' })}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              disabled={page === pagination.totalPages}
              onClick={() => fetchProducts(page + 1, keyword)}
              className="ds-btn"
              data-variant="secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          
          <p className="mt-4 text-center ds-small">
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
              <p className="ds-body mb-2">Are you sure you want to delete this product?</p>
              <p className="ds-h2 uppercase truncate">
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
