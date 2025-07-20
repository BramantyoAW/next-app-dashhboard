// src/app/dashboard/catalog/attribute/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { useProfile } from '@/app/dashboard/layout'
import { useRouter } from 'next/navigation'

interface Attribute {
  id: number | string
  name: string
  type: string
}

export default function AttributePage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)
  const profile = useProfile()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storeId = profile?.me?.user?.store_id

    if (!token) {
      router.push('/login')
      return
    }
    
    if (!storeId) return

    async function fetchAttributes() {
      try {
        const res = await getAllAttribute(token as string, storeId as number)
        setAttributes(res.getAllAttribute.data || [])
      } catch (err) {
        console.error('Failed to fetch attributes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttributes()
  }, [profile])

  const handleDelete = (id: number | string) => {
    const confirmDelete = confirm('Are you sure you want to delete this attribute?')
    if (confirmDelete) {
      setAttributes(prev => prev.filter(attr => attr.id !== id))
      // TODO: call deleteAttributeService(id)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attributes</h1>
        <Link
          href="/dashboard/catalog/attribute/create"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
        >
          + Create Attribute
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading attributes...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {attributes.map(attribute => (
            <div key={attribute.id} className="bg-white rounded-2xl shadow p-4 hover:shadow-lg transition flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700">{attribute.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Tipe: {attribute.type}</p>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleDelete(attribute.id)}
                  className="text-sm px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
