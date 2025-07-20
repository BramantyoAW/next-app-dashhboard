'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAttributeService } from '@/graphql/mutation/catalog/attribute'
import { useProfile } from '@/app/dashboard/layout'

export default function CreateAttributePage() {
  const [name, setName] = useState('')
  const router = useRouter()
  const profile = useProfile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  
    const form = e.currentTarget as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value
  
    const storeId = profile?.me?.user?.store_id
    if (!storeId) {
      alert('Store ID tidak ditemukan')
      return
    }
  
    const res = await createAttributeService(storeId, name, type)
    console.log('Submitting attribute:', { name, type })
  
    alert('Attribute created successfully!')
    router.push('/dashboard/catalog/attribute') // jangan lupa `/dashboard`
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Attribute</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-6 max-w-xl">
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
