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
  for (const url of ['/owner/web-store', '/owner/web-store/pages', '/owner/web-store/products', '/owner/web-store/orders']) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    const active = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('aside nav a.bg-blue-600')).map(a => a.textContent.trim());
    });
    console.log(`${url} -> SIDEBAR ACTIVE: ${JSON.stringify(active)}`);
  }
} catch (e) {
  console.log('ERR:', String(e).slice(0, 250));
} finally { await browser.close(); }
