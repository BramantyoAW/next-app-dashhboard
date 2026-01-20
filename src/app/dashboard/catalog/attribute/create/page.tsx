'use client'
import { useRouter } from 'next/navigation'
import { createAttributeService } from '@/graphql/mutation/catalog/attribute'
import { extractStoreId } from '@/lib/jwt'
import React, { useState } from 'react';

export default function CreateAttributePage() {
  const router = useRouter()
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const form = e.currentTarget as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value
    setSuccess(null);

    const token = localStorage.getItem('token');
    const storeId = extractStoreId(token);
    
    if (!token || !storeId) {
      router.push('/login'); // or '/select-store'
      return;
    }

    await createAttributeService(storeId, name, type)

    setSuccess('Attribute created successfully!')
    router.push('/dashboard/catalog/attribute')
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Attribute</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-6 max-w-xl">
        {/* Pesan Sukses */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}
      <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
            placeholder="e.g. Warna, Ukuran"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Type
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
          >
            <option value="">Select type</option>
            <option value="String">Text</option>
            <option value="Number">Number</option>
            <option value="Date">Date</option>
            <option value="Boolean">Yes/No</option>
          </select>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
