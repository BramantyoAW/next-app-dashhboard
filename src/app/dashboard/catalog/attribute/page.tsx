// src/app/dashboard/catalog/attribute/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { useRouter } from 'next/navigation'
import { extractStoreId } from '@/lib/jwt'
import ConfirmModal from '@/components/ConfirmModal';

interface Attribute {
  id: number | string
  name: string
  type: string
}

export default function AttributePage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('token');
  
      // 1. Wajib ada token
      if (!token) {
        router.replace('/login');
        return;
      }
  
      // 2. Ambil storeId dari token
      const storeId = extractStoreId(token);
      if (!storeId) {
        console.warn('Tidak ada storeId di token, arahkan ke login/pilih outlet.');
        router.replace('/login');
        return;
      }
  
      // 3. Fetch attribute
      try {
        const res = await getAllAttribute(token, storeId);
        setAttributes(res.getAllAttribute.data || []);
      } catch (err) {
        console.error('Failed to fetch attributes:', err);
        // optional: force logout kalau unauthorized
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
  
    bootstrap();
  }, [router]);
  

  const handleDelete = (id: number | string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== id))
    // TODO: call deleteAttributeService(id)
    setConfirmId(null)
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
            <div
              key={attribute.id}
              className="bg-white rounded-2xl shadow p-4 hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-700">
                  {attribute.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tipe: {attribute.type}
                </p>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => setConfirmId(attribute.id)}
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
        (() => {
          const selected = attributes.find(a => a.id === confirmId);
          return (
            <p>
              Apakah kamu yakin ingin menghapus attribute{' '}
              <span className="font-semibold text-gray-800">{selected?.name}</span>?
              <span className="font-semibold text-red-600"> ini akan menghapus semua data yang terkait</span>
            </p>
          );
        })()
      }
      onCancel={() => setConfirmId(null)}
      onConfirm={() => handleDelete(confirmId)}
      confirmText="Hapus"
      cancelText="Batal"
    />
  )}

    </div>
  )
}
