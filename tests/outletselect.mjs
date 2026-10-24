import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill('cupelis.ganteng@gmail.com');
  await page.locator('input[type="password"]').first().fill('Password@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 25000 });
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/dashboard/catalog/product/13/edit`);
  await page.waitForTimeout(7000);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(400); }
  const text = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ');
  const idx = text.indexOf('Edit Stok di Outlet');
  console.log('CTX:', idx >= 0 ? text.slice(idx, idx + 350) : 'select tidak ditemukan');
  const hasAdjust = /Current Stock/.test(text);
  console.log('StockCard (Current Stock) ada:', hasAdjust);
} catch (e) {
  console.log('ERR:', String(e).slice(0, 200));
} finally { await browser.close(); }
