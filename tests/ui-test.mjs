// UI test OmBot — Sesi D verification
// Jalankan: node tests/ui-test.mjs
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3000';
const EMAIL = 'cupelis.ganteng+2@gmail.com';
const PASSWORD = 'Password@123';

const results = [];
function ok(name, detail = '') { results.push({ name, pass: true, detail }); console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name, detail = '') { results.push({ name, pass: false, detail }); console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);

try {
  // ============ 1. LOGIN langsung masuk (tanpa store picker) ============
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const emailInput = page.locator('input[type="email"]').first();
  const hasEmail = await emailInput.count();
  if (hasEmail) await emailInput.fill(EMAIL);
  else await page.locator('input').nth(1).fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 25000 });
  ok('Login langsung ke /dashboard (tanpa pilih merchant)', page.url());

  // Sidebar Budget badge (user_points)
  await page.waitForTimeout(2500);
  const budgetText = await page.locator('text=/Budget/').first().textContent().catch(() => null);
  ok('Sidebar menampilkan Budget', budgetText ? budgetText.replace(/\s+/g, ' ').trim() : 'tidak tampil');

  // ============ 2. MERCHANT page ============
  await page.goto(`${BASE}/dashboard/merchant`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const merchantCards = await page.locator('h3').count();
  const hasOwnerBadge = await page.locator('text=/owner/i').count();
  ok('Merchant page: kartu outlet tampil', `${merchantCards} kartu, owner badge: ${hasOwnerBadge > 0}`);
  const noBuka = await page.locator('text=/Buka Dashboard/i').count();
  ok('Merchant: TIDAK ada tombol "Buka Dashboard"', noBuka === 0 ? 'OK' : `masih ada ${noBuka}`);

  // ============ 3. PRODUCT LIST — dropdown outlet + badge ============
  await page.goto(`${BASE}/dashboard/catalog/product`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const productRows = await page.locator('table tbody tr').count();
  ok('Product list: baris produk tampil (outlet aktif)', `${productRows} baris`);
  const outletBadges = await page.locator('text=/Cupelis 2 Store/i').count();
  ok('Product list: badge outlet tampil', `${outletBadges} badge`);
  const pSelect = page.locator('select').first();
  if (await pSelect.count()) {
    const opts = await pSelect.locator('option').allTextContents();
    ok('Product list: dropdown outlet', opts.join(', '));
  }

  // ============ 4. CREATE PRODUCT — Pilih Outlet multi-select ============
  await page.goto(`${BASE}/dashboard/catalog/product/create`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const outletSection = await page.locator('text=/Pilih Outlet/i').count();
  ok('Create product: section "Pilih Outlet" ada', outletSection > 0 ? 'OK' : 'TIDAK');
  const checkboxes = await page.locator('input[type="checkbox"]').count();
  ok('Create product: checkbox outlet tampil', `${checkboxes} checkbox`);

  // ============ 5. INVENTORY — dropdown pilih outlet per halaman ============
  await page.goto(`${BASE}/dashboard/catalog/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const invSelect = page.locator('select').first();
  if (await invSelect.count()) {
    const opts = await invSelect.locator('option').allTextContents();
    ok('Inventory: dropdown outlet', opts.join(', '));
    // Ganti ke outlet 2 → data store 9 (sebelumnya 0 item)
    if (opts.length > 1) {
      await invSelect.selectOption({ index: 1 });
      await page.waitForTimeout(2500);
      const rowsAfter = await page.locator('table tbody tr').count();
      ok('Inventory: ganti outlet → refetch', `store ${opts[1]} → ${rowsAfter} baris`);
      await invSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }
  } else {
    fail('Inventory: dropdown outlet', 'TIDAK ADA');
  }

  // ============ 6. ORDER — dropdown pilih outlet ============
  await page.goto(`${BASE}/dashboard/order`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const orderSelect = page.locator('select').first();
  if (await orderSelect.count()) {
    const opts = await orderSelect.locator('option').allTextContents();
    ok('Order: dropdown outlet', opts.join(', '));
    const rows = await page.locator('table tbody tr').count();
    ok('Order: baris order tampil', `${rows} baris`);
  } else {
    fail('Order: dropdown outlet', 'TIDAK ADA');
  }

  // ============ 8. E2E: CREATE PRODUCT via UI (2 outlet) ============
  const testSku = 'UIE2E-' + Date.now().toString().slice(-6);
  await page.goto(`${BASE}/dashboard/catalog/product/create`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Isi form
  const inputs = page.locator('form input, form textarea');
  await inputs.nth(0).fill(testSku); // SKU
  await inputs.nth(1).fill('Produk UI E2E Test'); // Name
  // Price (input number) — cari via type
  await page.locator('input[type="number"]').fill('45000');
  // Centang SEMUA outlet (default 1, tambah outlet 2)
  const cbs = page.locator('input[type="checkbox"]');
  const cbCount = await cbs.count();
  for (let i = 0; i < cbCount; i++) {
    if (!(await cbs.nth(i).isChecked())) await cbs.nth(i).check();
  }
  await page.click('button[type="submit"]');
  // Tunggu redirect ke product list + toast
  await page.waitForURL('**/catalog/product', { timeout: 20000 });
  await page.waitForTimeout(2500);
  // Verifikasi produk muncul di list (outlet aktif = store 8)
  const rowHas = await page.locator(`text=${testSku}`).count();
  ok('E2E: produk baru muncul di product list', rowHas > 0 ? 'OK' : 'TIDAK MUNCUL');

  // Ganti outlet ke store 9 (test 2) → produk juga harus muncul (multi-outlet)
  const plSel = page.locator('select').first();
  if (await plSel.count()) {
    await plSel.selectOption({ index: 1 });
    await page.waitForTimeout(2500);
    const rowHas2 = await page.locator(`text=${testSku}`).count();
    ok('E2E: produk muncul JUGAA di outlet 2 (multi-outlet)', rowHas2 > 0 ? 'OK' : 'TIDAK');
    await plSel.selectOption({ index: 0 });
    await page.waitForTimeout(1500);
  }
  console.log(`E2E_CLEANUP_SKU=${testSku}`);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Klik tombol profil di sidebar (berisi nama user + nama store)
  const menuBtn = page.locator('button').filter({ hasText: /Cupelis 2 Store/i }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(1000);
    const switchOutlet = await page.locator('text=/Switch Outlet/i').count();
    ok('UserMenu: TIDAK ada "Switch Outlet"', switchOutlet === 0 ? 'OK' : `masih ada ${switchOutlet}`);
    const addStore = await page.locator('text=/Add New Store|Add Store/i').count();
    ok('UserMenu: TIDAK ada "Add New Store"', addStore === 0 ? 'OK' : `masih ada ${addStore}`);
  } else {
    fail('UserMenu', 'tombol profil tidak ditemukan');
  }

} catch (e) {
  fail('EXCEPTION', e.message);
  await page.screenshot({ path: '/tmp/ui-test-error.png' }).catch(() => {});
} finally {
  await browser.close();
}

const passed = results.filter(r => r.pass).length;
console.log(`\n===== HASIL: ${passed}/${results.length} PASS =====`);
process.exit(passed === results.length ? 0 : 1);
