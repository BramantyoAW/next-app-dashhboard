import { chromium } from 'playwright';

const BASE = 'https://demostore.om-bot.com';
const rows = [];
const rec = (area, name, ok, detail = '') => {
  rows.push({ area, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? ' :: ' + detail : ''}`);
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

const netlog = [];
page.on('response', async (r) => {
  const u = r.url();
  if (!u.includes('/graphql')) return;
  let body = '';
  try { body = await r.text(); } catch {}
  let errs = null, dataKeys = null;
  try {
    const j = JSON.parse(body);
    errs = j.errors ? j.errors.map((e) => e.message) : null;
    dataKeys = j.data ? Object.keys(j.data) : null;
  } catch {}
  netlog.push({ status: r.status(), ct: r.headers()['content-type'] || '', errs, dataKeys, snippet: body.slice(0, 240) });
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

const isNonJson = (ct) => !/application\/json/i.test(ct || '');

async function goto(path) {
  const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // render storefront (Puck/client components) butuh hidrasi; domcontentloaded
  // sudah balik sebelum konten terpasang.
  await page.waitForTimeout(2500);
  return r ? r.status() : 0;
}

async function toRegister() {
  await goto('/sign-in');
  await page.waitForTimeout(1500);
  const t = page.locator('button, a').filter({ hasText: /^daftar$|register|buat akun/i }).first();
  if (await t.count()) { await t.click(); await page.waitForTimeout(1000); }
}

function authForm() {
  return page.locator('form').filter({ has: page.locator('input[type="password"]') }).first();
}

async function fillByPlaceholder(ph, val) {
  const scoped = authForm().locator(`input[placeholder*="${ph}" i]`).first();
  const el = (await scoped.count()) ? scoped : page.locator(`input[placeholder*="${ph}" i]`).first();
  if (!(await el.count())) return false;
  await el.fill(val);
  return true;
}

// Tombol submit form auth = button[type=submit] yang punya teks.
// Tombol ikon mata (toggle password) juga type=submit tapi teksnya kosong.
async function submitForm() {
  const form = authForm();
  const btn = (await form.count())
    ? form.locator('button[type="submit"]').filter({ hasText: /Daftar|Masuk|Memproses/ }).first()
    : page.locator('button[type="submit"]').filter({ hasText: /Daftar|Masuk|Memproses/ }).first();
  await btn.click();
}

const ts = Date.now();
const email = `uat.${ts}@example.com`;
const phone = '08' + String(ts).slice(-9);
const PASS = 'Test12345!';

// ================= 1. REGISTER (positive) =================
await toRegister();
await fillByPlaceholder('Nama lengkap', 'UAT Playwright');
await fillByPlaceholder('Email', email);
await fillByPlaceholder('No. HP', phone);
await fillByPlaceholder('Password', PASS);
await fillByPlaceholder('Konfirmasi password', PASS);
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4000);

const regCall = netlog.find((n) => (n.dataKeys || []).includes('customerRegister'));
const regErr = netlog.find((n) => n.errs && n.errs.length);
rec('register', 'POST /graphql sebagai JSON (bukan HTML 404)', netlog.length > 0 && netlog.every((n) => !isNonJson(n.ct)),
  netlog.length ? `ct=${netlog[0].ct} status=${netlog[0].status}` : 'tidak ada request graphql terkirim');
rec('register', 'customerRegister sukses (dapat token)', !!regCall, regCall ? JSON.stringify(regCall.dataKeys) : (regErr ? regErr.errs.join('; ') : 'no response'));
const urlAfterReg = page.url();
rec('register', 'redirect / sesi setelah register', !urlAfterReg.includes('/sign-in'), urlAfterReg);

// ================= 2. REGISTER duplicate email (negative) =================
await ctx.clearCookies();
await toRegister();
await fillByPlaceholder('Nama lengkap', 'UAT Dup');
await fillByPlaceholder('Email', email);          // email sama
await fillByPlaceholder('No. HP', '08' + String(ts + 7).slice(-9));
await fillByPlaceholder('Password', PASS);
await fillByPlaceholder('Konfirmasi password', PASS);
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4000);
const bodyDup = await page.locator('body').innerText().catch(() => '');
const dupErr = netlog.flatMap((n) => n.errs || []);
const rawLeak = /SQLSTATE|Integrity constraint|Duplicate entry/i.test(bodyDup + ' ' + dupErr.join(' '));
rec('register-neg', 'email duplikat ditolak', dupErr.length > 0 || /sudah|terdaftar|digunakan/i.test(bodyDup), dupErr[0] || bodyDup.slice(0, 100).replace(/\n/g, ' '));
rec('register-neg', 'error mentah DB TIDAK bocor ke UI', !rawLeak, rawLeak ? 'BOCOR: ' + (dupErr[0] || '').slice(0, 120) : 'bersih');

// ================= 3. REGISTER duplicate phone (negative) =================
await ctx.clearCookies();
await toRegister();
await fillByPlaceholder('Nama lengkap', 'UAT Dup Phone');
await fillByPlaceholder('Email', `uat.dup.${ts}@example.com`);
await fillByPlaceholder('No. HP', phone);          // phone sama
await fillByPlaceholder('Password', PASS);
await fillByPlaceholder('Konfirmasi password', PASS);
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4000);
const bodyPh = await page.locator('body').innerText().catch(() => '');
const phErr = netlog.flatMap((n) => n.errs || []);
const phLeak = /SQLSTATE|Integrity constraint|Duplicate entry/i.test(bodyPh + ' ' + phErr.join(' '));
rec('register-neg', 'telepon duplikat ditolak', phErr.length > 0 || /sudah|terdaftar|digunakan/i.test(bodyPh), phErr[0] || bodyPh.slice(0, 100).replace(/\n/g, ' '));
rec('register-neg', 'error mentah DB (phone) TIDAK bocor', !phLeak, phLeak ? 'BOCOR: ' + (phErr[0] || '').slice(0, 120) : 'bersih');

// ================= 4. REGISTER mismatch password (negative) =================
await ctx.clearCookies();
await toRegister();
await fillByPlaceholder('Nama lengkap', 'UAT Mismatch');
await fillByPlaceholder('Email', `uat.mis.${ts}@example.com`);
await fillByPlaceholder('No. HP', '08' + String(ts + 11).slice(-9));
await fillByPlaceholder('Password', 'Test12345!');
await fillByPlaceholder('Konfirmasi password', 'BedaSekali99!');
netlog.length = 0;
await submitForm();
await page.waitForTimeout(3000);
const bodyMis = await page.locator('body').innerText().catch(() => '');
rec('register-neg', 'konfirmasi password beda ditolak', /tidak sama|tidak cocok|mismatch|sama/i.test(bodyMis) || netlog.length === 0,
  netlog.length === 0 ? 'diblokir di klien (tidak kirim request)' : bodyMis.slice(0, 100).replace(/\n/g, ' '));

// ================= 5. LOGIN (positive) =================
await ctx.clearCookies();
await goto('/sign-in');
await page.waitForTimeout(1500);
await fillByPlaceholder('Email', email);
await fillByPlaceholder('Password', PASS);
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4500);
const loginCall = netlog.find((n) => (n.dataKeys || []).some((k) => /login/i.test(k)));
const loginErr = netlog.flatMap((n) => n.errs || []);
rec('login', 'login sukses (bukan HTML 404)', netlog.length > 0 && netlog.every((n) => !isNonJson(n.ct)),
  netlog.length ? `ct=${netlog[0].ct} status=${netlog[0].status}` : 'tidak ada request');
rec('login', 'token/sesi didapat', !!loginCall, loginCall ? JSON.stringify(loginCall.dataKeys) : (loginErr[0] || 'no response'));
rec('login', 'keluar dari halaman sign-in', !page.url().includes('/sign-in'), page.url());

// ================= 6. LOGIN wrong password (negative) =================
await ctx.clearCookies();
await goto('/sign-in');
await page.waitForTimeout(1500);
await fillByPlaceholder('Email', email);
await fillByPlaceholder('Password', 'PasswordSalah999!');
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4000);
const bodyWrong = await page.locator('body').innerText().catch(() => '');
const wrongErr = netlog.flatMap((n) => n.errs || []);
rec('login-neg', 'password salah ditolak + pesan jelas', /salah|invalid|tidak valid|gagal|credentials/i.test(bodyWrong) || wrongErr.length > 0,
  wrongErr[0] || bodyWrong.slice(0, 120).replace(/\n/g, ' '));
rec('login-neg', 'tetap di halaman sign-in', page.url().includes('/sign-in'), page.url());

// ================= 7. LOGIN unknown email (negative) =================
await ctx.clearCookies();
await goto('/sign-in');
await page.waitForTimeout(1500);
await fillByPlaceholder('Email', `tidak.ada.${ts}@example.com`);
await fillByPlaceholder('Password', PASS);
netlog.length = 0;
await submitForm();
await page.waitForTimeout(4000);
const bodyUnknown = await page.locator('body').innerText().catch(() => '');
rec('login-neg', 'email tak terdaftar ditolak', !page.url().includes('/dashboard') && (/salah|tidak|invalid|gagal/i.test(bodyUnknown) || netlog.flatMap((n) => n.errs || []).length > 0),
  bodyUnknown.slice(0, 120).replace(/\n/g, ' '));

// ================= 8. STOREFRONT data render =================
for (const [label, path] of [['home', '/'], ['products', '/products'], ['category', '/categories/demo-kategori']]) {
  const st = await goto(path);
  const txt = await page.locator('body').innerText().catch(() => '');
  rec('storefront', `${label} 200 & ada konten`, st === 200 && txt.length > 200, `HTTP ${st} len=${txt.length}`);
}
// category slug tidak ada -> harus 404
const stBadCat = await goto('/categories/slug-tidak-ada');
rec('storefront-neg', 'kategori tak dikenal -> 404', stBadCat === 404, `HTTP ${stBadCat}`);

const gqlThroughBrowser = netlog.filter((n) => isNonJson(n.ct));
rec('storefront', 'semua fetch graphql dari browser = JSON', gqlThroughBrowser.length === 0,
  gqlThroughBrowser.length ? `${gqlThroughBrowser.length} non-JSON` : 'bersih');

console.log('\n=== PAGE ERRORS ===');
console.log(pageErrors.length ? JSON.stringify(pageErrors, null, 1) : '(none)');

const pass = rows.filter((r) => r.ok).length;
console.log(`\n=== SUMMARY ${pass}/${rows.length} PASS ===`);
await browser.close();
process.exit(pass === rows.length ? 0 : 1);
