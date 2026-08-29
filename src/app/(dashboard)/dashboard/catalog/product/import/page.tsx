'use client'

import { useEffect, useState } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { getActiveStoreId } from '@/lib/jwt'
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
      const storeId = getActiveStoreId(token)
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
      const storeId = getActiveStoreId(token)
      if (!storeId) throw new Error('Store ID not found')

      // Kolom dasar produk. Kolom non-baku lain = varian (mis. Ukuran, Warna).
      const baseFields = ['sku', 'name', 'description', 'price', 'image']
      // Contoh kolom varian yang disertakan di template (sesuai kebutuhan umum).
      const variantColumns = ['Ukuran', 'Warna']
      const allHeaders = [...baseFields, ...variantColumns]

      // Contoh: 2 produk TANPA varian (kolom varian KOSONG) + 2 produk DENGAN varian.
      const dummyData = [
        {
          sku: 'SKU-001',
          name: 'Contoh Produk Tanpa Varian 1',
          description: 'Produk ini tidak punya varian — kolom Ukuran & Warna dibiarkan KOSONG.',
          price: 25000,
          image: 'https://via.placeholder.com/200',
          Ukuran: '',
          Warna: '',
        },
        {
          sku: 'SKU-002',
          name: 'Contoh Produk Tanpa Varian 2',
          description: 'Produk tanpa varian = stok diatur via Current Stock / Inventory.',
          price: 50000,
          image: 'https://via.placeholder.com/200',
          Ukuran: '',
          Warna: '',
        },
        {
          sku: 'SKU-003',
          name: 'Contoh Produk Dengan Varian 1',
          description: 'Produk ber-varian: isi kolom Ukuran & Warna. Stok diatur per varian.',
          price: 75000,
          image: 'https://via.placeholder.com/200',
          Ukuran: 'M',
          Warna: 'Merah',
        },
        {
          sku: 'SKU-004',
          name: 'Contoh Produk Dengan Varian 2',
          description: 'Baris lain produk sama SKU berbeda = opsi varian lain.',
          price: 75000,
          image: 'https://via.placeholder.com/200',
          Ukuran: 'L',
          Warna: 'Biru',
        },
      ]

      const wb = XLSX.utils.book_new()

      // Sheet 1: Produk
      const ws = XLSX.utils.json_to_sheet(dummyData, { header: allHeaders })
      // Lebarkan kolom supaya teks deskripsi terbaca
      ws['!cols'] = [
        { wch: 12 }, { wch: 34 }, { wch: 55 }, { wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Produk')

      // Sheet 2: Petunjuk
      const guideData = [
        { 'Petunjuk': 'CARA ISI FILE IMPORT PRODUK', 'Detail': '' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '1. Kolom WAJIB', 'Detail': 'sku, name, price. Kolom lain opsional.' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '2. Produk TANPA varian', 'Detail': 'Isi kolom dasar SAJA. Biarkan kolom varian (Ukuran, Warna, dll) KOSONG.' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '3. Produk DENGAN varian', 'Detail': 'Isi kolom varian sesuai opsi produk, mis. Ukuran = M, Warna = Merah.' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '4. Beberapa opsi varian', 'Detail': 'Buat beberapa BARIS dengan SKU berbeda, isi varian berbeda (contoh SKU-003 & SKU-004).' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '5. Kolom baru = varian baru', 'Detail': 'Kolom apa pun selain sku/name/description/price/image yang kamu tambahkan akan dianggap varian.' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': '6. Stok', 'Detail': 'Import TIDAK mengisi stok. Produk tanpa varian: atur via menu Inventory (Current Stock). Produk dengan varian: atur stok per varian di detail produk.' },
        { 'Petunjuk': '', 'Detail': '' },
        { 'Petunjuk': 'CONTOH:', 'Detail': '' },
        { 'Petunjuk': 'Tanpa varian', 'Detail': 'sku=BT-001, name=Batik Tulis, price=450000, (Ukuran/Warna kosong)' },
        { 'Petunjuk': 'Dengan varian', 'Detail': 'sku=KOPI-250, name=Kopi Gayo, price=85000, Ukuran=250g, Warna=Bubuk' },
      ]
      const wsGuide = XLSX.utils.json_to_sheet(guideData, { header: ['Petunjuk', 'Detail'] })
      wsGuide['!cols'] = [{ wch: 45 }, { wch: 90 }]
      XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk')

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
          <p className="text-sm text-gray-600 mb-3">
            Template berisi 2 sheet: <b>Produk</b> (isi data) & <b>Petunjuk</b> (panduan cara isi, termasuk contoh produk dengan & tanpa varian).
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
            <li><b>Tanpa varian</b> → isi kolom sku/name/price, biarkan kolom Ukuran/Warna <b>kosong</b>. Stok diatur via <b>Inventory</b>.</li>
            <li><b>Dengan varian</b> → isi kolom Ukuran/Warna. Stok diatur <b>per varian</b> di detail produk.</li>
            <li>Kolom apa pun selain sku/name/description/price/image = <b>varian baru</b>.</li>
          </ul>
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
