import { chromium } from 'playwright';

const BASE = 'https://demostore.om-bot.com';
const rows = [];
const rec = (area, name, ok, detail = '') => {
  rows.push({ area, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? ' :: ' + detail : ''}`);
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

const gql = [];
page.on('response', async (r) => {
  if (!r.url().includes('/graphql')) return;
  let body = '';
  try { body = await r.text(); } catch {}
  let errs = null, keys = null, data = null;
  try { const j = JSON.parse(body); errs = j.errors?.map((e) => e.message) ?? null; keys = j.data ? Object.keys(j.data) : null; data = j.data; } catch {}
  gql.push({ status: r.status(), ct: r.headers()['content-type'] || '', errs, keys, data, snippet: body.slice(0, 300) });
});

const ts = Date.now();
const email = `co.${ts}@example.com`;
const phone = '08' + String(ts).slice(-9);
const PASS = 'Test12345!';

// ---- helper: register via UI ----
async function register() {
  await page.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1800);
  const t = page.locator('button, a').filter({ hasText: /^daftar$/i }).first();
  if (await t.count()) { await t.click(); await page.waitForTimeout(1200); }
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).first();
  const fill = async (ph, v) => {
    const el = form.locator(`input[placeholder*="${ph}" i]`).first();
    if (await el.count()) await el.fill(v);
  };
  await fill('Nama lengkap', 'UAT Checkout');
  await fill('Email', email);
  await fill('No. HP', phone);
  await fill('Password', PASS);
  await fill('Konfirmasi password', PASS);
  gql.length = 0;
  await form.locator('button[type="submit"]').filter({ hasText: /daftar|memproses/i }).first().click();
  await page.waitForTimeout(5000);
}

await register();
const token = await page.evaluate(() => localStorage.getItem('customer_token'));
rec('checkout', 'sesi customer aktif setelah register', !!token, token ? `len=${token.length}` : 'token kosong');

// ---- seed cart via app's own storage contract (lib/cart.ts) ----
await page.evaluate(() => {
  localStorage.setItem('storefront_cart_demostore', JSON.stringify([{
    store_product_id: '1', sku: 'DEMO001', name: 'DEMOS PRODUCT',
    price: 5500, image: null, qty: 3,
  }]));
});

// ---- checkout page loads ----
const r = await page.goto(BASE + '/checkout', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(3000);
rec('checkout', 'halaman checkout 200', r.status() === 200, `HTTP ${r.status()}`);

const bodyCo = await page.locator('body').innerText().catch(() => '');
rec('checkout', 'item keranjang tampil di checkout', /DEMOS PRODUCT/i.test(bodyCo), bodyCo.length + ' chars');
rec('checkout', 'pilihan Ambil di Outlet tersedia', /Ambil di Outlet/i.test(bodyCo));

// ---- NEGATIVE 1: submit tanpa pilih outlet pickup ----
const pickupBtn = page.locator('button').filter({ hasText: /^Ambil di Outlet$/ }).first();
if (await pickupBtn.count()) { await pickupBtn.click(); await page.waitForTimeout(1000); }
const pmRadios = page.locator('input[name="pm"]');
const pmCount = await pmRadios.count();
rec('checkout', 'metode pembayaran ter-render', pmCount > 0, `${pmCount} opsi`);

// isi nama+hp, tanpa pilih outlet
const fill2 = async (ph, v) => {
  const el = page.locator(`input[placeholder*="${ph}" i]`).first();
  if (await el.count()) { await el.fill(v); return true; }
  return false;
};
await fill2('Nama penerima', 'UAT Penerima');
await fill2('No. HP', '081234567890');
gql.length = 0;
const submitBtn = page.locator('form button[type="submit"]').last();
await submitBtn.click();
await page.waitForTimeout(3000);
const bodyNoOutlet = await page.locator('body').innerText();
rec('checkout-neg', 'pickup tanpa outlet ditolak', /pilih outlet/i.test(bodyNoOutlet),
  (bodyNoOutlet.match(/Pilih outlet[^\n]*/i) || [''])[0]);
rec('checkout-neg', 'tidak ada order terkirim saat validasi gagal', gql.filter((g) => g.keys?.includes('placeWebOrder')).length === 0);

// ---- NEGATIVE 2: kupon tidak valid ----
const coupInput = page.locator('input[placeholder*="kode kupon" i]').first();
if (await coupInput.count()) {
  await coupInput.fill('NOPE999');
  await page.locator('button').filter({ hasText: /^Pakai$/ }).first().click();
  await page.waitForTimeout(2500);
  const bodyCoup = await page.locator('body').innerText();
  rec('checkout-neg', 'kupon tidak ada ditolak di UI', /tidak ditemukan|tidak valid|gagal/i.test(bodyCoup),
    (bodyCoup.match(/Kode kupon[^\n]*/) || [''])[0]);
} else {
  rec('checkout-neg', 'input kupon ada di checkout', false, 'input kupon tidak ditemukan');
}

// ---- NEGATIVE 3: kupon kedaluwarsa ----
if (await coupInput.count()) {
  await coupInput.fill('EXPIRED');
  await page.locator('button').filter({ hasText: /^Pakai$/ }).first().click();
  await page.waitForTimeout(2500);
  const bodyExp = await page.locator('body').innerText();
  rec('checkout-neg', 'kupon kedaluwarsa ditolak', /kedaluwarsa/i.test(bodyExp),
    (bodyExp.match(/Kupon sudah[^\n]*/) || [''])[0]);
}

// ---- POSITIVE: kupon valid ----
if (await coupInput.count()) {
  await coupInput.fill('DEMO10');
  await page.locator('button').filter({ hasText: /^Pakai$/ }).first().click();
  await page.waitForTimeout(3000);
  const bodyOk = await page.locator('body').innerText();
  rec('checkout', 'kupon valid diterapkan', /DEMO10/.test(bodyOk) && /-\s*Rp/.test(bodyOk),
    (bodyOk.match(/DEMO10[^\n]*/) || [''])[0]);
}

// ---- POSITIVE: checkout pickup lengkap ----
const outletRadio = page.locator('input[name="pickup"]').first();
const outletCount = await outletRadio.count();
rec('checkout', 'outlet pickup ter-render', outletCount > 0, `${outletCount} outlet`);
if (outletCount > 0) {
  await outletRadio.check();
  await page.waitForTimeout(600);
}
if (pmCount > 0) await pmRadios.first().check();
await page.waitForTimeout(600);

gql.length = 0;
await submitBtn.click();
await page.waitForTimeout(8000);

const orderCall = gql.find((g) => g.keys?.includes('placeWebOrder'));
const orderErr = orderCall?.errs;
const orderId = orderCall?.data?.placeWebOrder?.order?.id;
rec('checkout', 'placeWebOrder berhasil', !!orderCall && !orderErr, orderErr ? orderErr[0] : `orderId=${orderId}`);
rec('checkout', 'redirect ke halaman sukses/thankyou', /thankyou|orders\//.test(page.url()), page.url());
const bodyDone = await page.locator('body').innerText().catch(() => '');
rec('checkout', 'pesanan tercatat tampil ke pembeli', /pesanan|order|terima kasih/i.test(bodyDone), bodyDone.slice(0, 100).replace(/\n/g, ' '));

console.log('\n=== ORDER ID:', orderId, '===');
console.log('\n=== GQL NON-JSON:', gql.filter((g) => !/application\/json/i.test(g.ct)).length, '===');

const pass = rows.filter((x) => x.ok).length;
console.log(`\n=== SUMMARY ${pass}/${rows.length} PASS ===`);
await browser.close();
