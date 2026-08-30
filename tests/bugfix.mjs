import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
page.on('response', async r => {
  if (r.url().includes('8000') && r.request().method() === 'POST') {
    const pd = r.request().postData() || '';
    if (pd.includes('createProduct')) {
      const body = await r.text().catch(() => '');
      console.log('CREATE RESP:', body.slice(0, 300).replace(/\n/g, ' '));
    }
  }
});
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill('cupelis.ganteng@gmail.com');
  await page.locator('input[type="password"]').first().fill('Password@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 25000 });
  await page.waitForTimeout(4000);
  await page.goto(`${BASE}/dashboard/catalog/product/create`);
  await page.waitForTimeout(6000);
  await page.locator('label:has-text("SKU")').locator('..').locator('input').fill('TEST-OUTLET-ONLY');
  await page.locator('label:has-text("Name")').locator('..').locator('input').fill('Test Outlet Only');
  await page.locator('label:has-text("Price")').locator('..').locator('input').fill('5000');
  await page.waitForTimeout(300);
  const boxes = page.locator('input[type="checkbox"]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) { if (await boxes.nth(i).isChecked()) await boxes.nth(i).uncheck(); }
  await page.locator('text=/Jakal KM10/').first().click();
  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);
  const text = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ');
  const m = text.match(/(Gagal|error|Error|sudah|harus|SKU)[^.]{0,120}/g);
  console.log('ERROR TEXT:', m ? m.slice(0,3).join(' | ') : 'none');
} catch (e) { console.log('ERR:', String(e).slice(0,200)); }
finally { await browser.close(); }
