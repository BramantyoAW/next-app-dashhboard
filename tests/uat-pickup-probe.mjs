import { chromium } from 'playwright';
const BASE = 'https://demostore.om-bot.com';
const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 1000 } });
const p = await c.newPage();

const gql = [];
p.on('response', async (r) => {
  if (!r.url().includes('/graphql')) return;
  let t = ''; try { t = await r.text(); } catch {}
  let j = null; try { j = JSON.parse(t); } catch {}
  gql.push({ ct: r.headers()['content-type'] || '', errs: j?.errors?.map(e => e.message) ?? null, keys: j?.data ? Object.keys(j.data) : null });
});

const ts = Date.now();
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForTimeout(1800);
const t = p.locator('button, a').filter({ hasText: /^daftar$/i }).first();
if (await t.count()) { await t.click(); await p.waitForTimeout(1200); }
const form = p.locator('form').filter({ has: p.locator('input[type="password"]') }).first();
const fill = async (ph, v) => { const el = form.locator(`input[placeholder*="${ph}" i]`).first(); if (await el.count()) await el.fill(v); };
await fill('Nama lengkap', 'Pickup Test');
await fill('Email', `pk.${ts}@example.com`);
await fill('No. HP', '08' + String(ts).slice(-9));
await fill('Password', 'Test12345!');
await fill('Konfirmasi password', 'Test12345!');
await form.locator('button[type="submit"]').filter({ hasText: /daftar|memproses/i }).first().click();
await p.waitForTimeout(5000);

await p.evaluate(() => localStorage.setItem('storefront_cart_demostore', JSON.stringify([{
  store_product_id: '1', sku: 'DEMO001', name: 'DEMOS PRODUCT', price: 5500, image: null, qty: 1,
}])));

await p.goto(BASE + '/checkout', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForTimeout(3000);

// switch ke pickup
await p.locator('button').filter({ hasText: /^Ambil di Outlet$/ }).first().click();
await p.waitForTimeout(1200);

console.log('=== INPUTS VISIBLE DI MODE PICKUP ===');
console.log(JSON.stringify(await p.locator('form input, form textarea').evaluateAll(els => els.map(e => ({
  ph: e.placeholder, type: e.type, name: e.name, required: e.required,
  visible: !!(e.offsetWidth || e.offsetHeight),
})).filter(x => x.visible)), null, 1));

await p.locator('input[name="pickup"]').first().check();
await p.waitForTimeout(500);
await p.locator('input[name="pm"]').first().check();
await p.waitForTimeout(500);

gql.length = 0;
await p.locator('form button[type="submit"]').last().click();
await p.waitForTimeout(6000);

const body = await p.locator('body').innerText();
console.log('\n=== PESAN ERROR DI HALAMAN ===');
const lines = body.split('\n').map(s => s.trim()).filter(Boolean);
console.log(JSON.stringify(lines.filter(l => /wajib|pilih|gagal|error|tidak/i.test(l)).slice(0, 10), null, 1));

console.log('\n=== GQL SETELAH SUBMIT ===');
console.log(JSON.stringify(gql, null, 1));
console.log('\nURL:', p.url());
await b.close();
