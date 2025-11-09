import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getAllInventory } from '@/graphql/query/inventory/getAllInventory';
import { extractStoreId } from '@/lib/jwt';

export async function downloadInventoryTemplate() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token not found');

  const storeId = extractStoreId(token);
  if (!storeId) throw new Error('Store ID not found');

  // 🔹 ambil semua produk dari inventory GraphQL
  const products = await getAllInventory(token, String(storeId), '');

  // 🔹 bentuk data Excel
  const sheetData = [
    ['SKU', 'Quantity'], // header
    ...products.map((item: any) => [item.product?.sku || '', item.current_qty ?? 0]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'InventoryTemplate');

  const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, `inventory_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
