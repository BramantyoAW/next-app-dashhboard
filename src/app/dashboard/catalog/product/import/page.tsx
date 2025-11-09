'use client'

import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { getAllAttribute } from '@/graphql/query/catalog/getAllAttributes'
import { extractStoreId } from '@/lib/jwt'
import { toast } from 'sonner'
import { importProducts } from '@/graphql/mutation/catalog/importProduct'
import { getImportHistories } from '@/graphql/query/catalog/getImportHistories'

export default function ImportProductPage() {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [histories, setHistories] = useState<any[]>([])
  
  const fetchHistories = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const storeId = extractStoreId(token)
      if (!storeId) return
      const data = await getImportHistories(token, String(storeId))
      setHistories(data)
    } catch (err) {
      console.error('Gagal load import histories:', err)
    }
  }
  
  useEffect(() => {
    fetchHistories()
  }, [])
  
  const handleDownloadTemplate = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Token not found')
      const storeId = extractStoreId(token)
      if (!storeId) throw new Error('Store ID not found')

      // Ambil semua attribute
      const res = await getAllAttribute(token, storeId)
      const attributes = res?.getAllAttribute?.data || []

      // Kolom dasar produk
      const baseFields = ['sku', 'name', 'description', 'price', 'image']

      // Gabungkan semua field (base + attribute names)
      const allHeaders = [...baseFields, ...attributes.map((a: any) => a.name)]

      // Buat 3 contoh produk dummy
      const dummyData = [
        {
          sku: 'SKU-001',
          name: 'Contoh Produk 1',
          description: 'Deskripsi singkat produk pertama',
          price: 25000,
          image: 'https://via.placeholder.com/200',
          ...Object.fromEntries(attributes.map((a: any) => [a.name, 'Value 1'])),
        },
        {
          sku: 'SKU-002',
          name: 'Contoh Produk 2',
          description: 'Deskripsi produk kedua',
          price: 50000,
          image: 'https://via.placeholder.com/200',
          ...Object.fromEntries(attributes.map((a: any) => [a.name, 'Value 2'])),
        },
        {
          sku: 'SKU-003',
          name: 'Contoh Produk 3',
          description: 'Deskripsi produk ketiga',
          price: 75000,
          image: 'https://via.placeholder.com/200',
          ...Object.fromEntries(attributes.map((a: any) => [a.name, 'Value 3'])),
        },
      ]

      // Buat worksheet & workbook
      const ws = XLSX.utils.json_to_sheet(dummyData, { header: allHeaders })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Products')

      // Convert ke Blob dan download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, 'product_import_template.xlsx')

      toast.success('Template berhasil diunduh')
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal membuat template')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      toast.success(`File "${file.name}" berhasil dipilih`)
    }
  }

  const handleSubmit = async () => {
    if (!uploadFile) {
      toast.error('Silakan pilih file terlebih dahulu')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Token not found')

      console.log('🟢 Uploading file:', uploadFile.name, uploadFile.type, uploadFile.size)

      setLoading(true)
      const result = await importProducts(token, uploadFile)
      toast.success(result.message || 'Import berhasil!')
      await fetchHistories() // refresh list setelah upload selesai
    } catch (err: any) {
      console.error('❌ Upload error:', err)
      toast.error(err.message || 'Gagal import produk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Bulk Import Products</h1>

        {/* Download Template */}
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Step 1: Download Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Template ini berisi kolom penting produk dan semua atribut yang tersedia.
          </p>
          <button
            onClick={handleDownloadTemplate}
            disabled={loading}
            className={`px-4 py-2 rounded text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Generating...' : 'Download Template (.xlsx)'}
          </button>
        </div>

        <hr className="my-6" />

        {/* Upload File */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Step 2: Upload Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload file Excel yang sudah kamu isi sesuai format template.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleUpload}
            className="block w-full text-sm border border-gray-300 rounded p-2"
          />
          {uploadFile && (
            <p className="text-sm text-green-600 mt-2">
              ✅ {uploadFile.name} siap diupload
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded"
        >
          Upload & Import
        </button>

        <div className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Riwayat Import Terakhir</h2>
        <table className="w-full text-sm border border-gray-200 rounded">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 text-left">Filename</th>
              <th className="p-2">Status</th>
              <th className="p-2">Created</th>
              <th className="p-2">Updated</th>
              <th className="p-2">Failed</th>
              <th className="p-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {histories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-400">
                  Belum ada riwayat import
                </td>
              </tr>
            ) : (
              histories.map(h => (
                <tr key={h.id} className="border-t">
                  <td className="p-2">{h.filename}</td>
                  <td className="p-2 capitalize">{h.status}</td>
                  <td className="p-2 text-green-600">{h.created_count}</td>
                  <td className="p-2 text-blue-600">{h.updated_count}</td>
                  <td className="p-2 text-red-600">{h.failed_count}</td>
                  <td className="p-2 text-gray-500">
                    {new Date(h.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
