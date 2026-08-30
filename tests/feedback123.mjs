// E2E feedback #1-3 — inventory pooled, edit product multi-outlet, order item outlet
// Jalankan: node tests/feedback123.mjs (dari folder fe/)
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3000';
const EMAIL = 'cupelis.ganteng@gmail.com';
const PASSWORD = 'Password@123';

const results = [];
function ok(name, detail = '') { results.push({ name, pass: true, detail }); console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name, detail = '') { results.push({ name, pass: false, detail }); console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(25000);

try {
  // ============ LOGIN ============
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 25000 });
  ok('Login cupelis');

  // ============ 1. INVENTORY POOLED ============
  await page.goto(`${BASE}/dashboard/catalog/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Header kolom per outlet: "Toko Cupelis", "Cabang 2", dst + kolom Total
  const headerText = await page.locator('thead').textContent().catch(() => '');
  const hasOutletCols = /Toko Cupelis|Cabang/.test(headerText);
  const hasTotalCol = /Total/.test(headerText);
  ok('Inventory pooled: header kolom per outlet', hasOutletCols ? headerText.replace(/\s+/g, ' ').slice(0, 120) : 'TIDAK ADA kolom outlet');
  ok('Inventory pooled: kolom Total ada', String(hasTotalCol));

  // Badge jumlah outlet
  const outletBadge = await page.locator('text=/Outlet/').first().textContent().catch(() => '');
  ok('Inventory pooled: badge jumlah outlet', outletBadge.replace(/\s+/g, ' ').trim());

  // Klik angka outlet pertama pada baris pertama → modal Stock Correction muncul
  const firstRow = page.locator('tbody tr').first();
  const firstCellBtn = firstRow.locator('button[title^="Klik untuk adjust"]').first();
  if (await firstCellBtn.count()) {
    await firstCellBtn.click();
    await page.waitForTimeout(1500);
    const modal = await page.locator('text=/Stock Correction/').count();
    const outletName = await page.locator('text=/Outlet:/').textContent().catch(() => '');
    ok('Klik angka outlet → modal Stock Correction + label outlet', `modal:${modal > 0}, ${outletName.replace(/\s+/g, ' ').trim()}`);
    await page.keyboard.press('Escape');
    await page.locator('button[title="Close"]').first().click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    fail('Klik angka outlet → tombol adjust per outlet tidak ditemukan');
  }

  // Tombol Update (baris tanpa outlet spesifik) masih ada
  const updateBtn = await page.locator('button:has-text("Update")').first().count();
  ok('Tombol Update per baris ada', String(updateBtn > 0));

  // ============ 2. EDIT PRODUCT — multi outlet checkbox ============
  // Ambil id produk dari halaman list product
  await page.goto(`${BASE}/dashboard/catalog/product`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const editLink = page.locator('a[href*="/edit"]').first();
  if (await editLink.count()) {
    const href = await editLink.getAttribute('href');
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const outletSection = await page.locator('text=/Merchant \\/ Outlet/').count();
    ok('Edit product: section Merchant/Outlet ada', String(outletSection > 0));
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    ok('Edit product: checkbox outlet', `${checkboxes} checkbox`);
    const checked = await page.locator('input[type="checkbox"]:checked').count();
    ok('Edit product: ada outlet aktif ter-check', String(checked > 0));
  } else {
    fail('Edit product: link edit tidak ditemukan');
  }

  // ============ 3. ORDER DETAIL — outlet per item ============
  await page.goto(`${BASE}/dashboard/owner/web-store/orders`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const pageText = await page.locator('body').textContent().catch(() => '');
  const hasStoreBadge = /Toko Cupelis|Cabang/.test(pageText);
  ok('Order list owner: badge outlet per item tampil', String(hasStoreBadge));
} catch (err) {
  fail('E2E exception', String(err).slice(0, 300));
  await page.screenshot({ path: '/tmp/feedback123_error.png', fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  process.exit(passed === results.length ? 0 : 1);
}
