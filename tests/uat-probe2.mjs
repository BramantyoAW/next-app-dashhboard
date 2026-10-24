import { chromium } from 'playwright';

const BASE = 'https://demostore.om-bot.com';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

const reqs = [];
page.on('request', (r) => {
  if (r.method() === 'POST') reqs.push({ url: r.url(), ct: r.headers()['content-type'] || '', post: (r.postData() || '').slice(0, 200) });
});

await page.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2000);

// klik Daftar
const t = page.locator('button, a').filter({ hasText: /^daftar$/i }).first();
console.log('daftar toggle count:', await t.count());
if (await t.count()) { await t.click(); await page.waitForTimeout(1500); }

console.log('\n=== BUTTONS ===');
console.log(JSON.stringify(await page.locator('button').evaluateAll((els) => els.map((e) => ({
  text: (e.innerText || '').trim().slice(0, 40), type: e.type, disabled: e.disabled,
  cls: (e.className || '').slice(0, 60),
}))), null, 1));

console.log('\n=== FORMS ===');
console.log(JSON.stringify(await page.locator('form').evaluateAll((fs) => fs.map((f) => ({
  action: f.getAttribute('action'), method: f.getAttribute('method'),
  inputs: Array.from(f.querySelectorAll('input')).map((i) => i.placeholder || i.name || i.type),
  buttons: Array.from(f.querySelectorAll('button')).map((b) => ({ t: (b.innerText || '').trim().slice(0, 30), type: b.type })),
}))), null, 1));

// isi form
const fill = async (ph, v) => {
  const el = page.locator(`input[placeholder*="${ph}" i]`).first();
  if (await el.count()) { await el.fill(v); console.log('filled', ph, '=', v); return true; }
  console.log('NOT FOUND input', ph); return false;
};
const ts = Date.now();
await fill('Nama lengkap', 'Probe User');
await fill('Email', `probe.${ts}@example.com`);
await fill('No. HP', '08' + String(ts).slice(-9));
await fill('Password', 'Test12345!');
await fill('Konfirmasi password', 'Test12345!');

// cek validasi HTML5 sebelum klik
const invalid = await page.locator('input').evaluateAll((els) => els.map((e) => ({
  ph: e.placeholder, val: e.value ? 'filled' : 'EMPTY', valid: e.checkValidity?.(), msg: e.validationMessage || '',
})).filter((x) => x.valid === false));
console.log('\n=== INVALID INPUTS ===');
console.log(JSON.stringify(invalid, null, 1));

// klik submit
const submit = page.locator('form button[type="submit"], form button').last();
console.log('\nsubmit text:', await submit.innerText().catch(() => '?'));
await submit.click();
await page.waitForTimeout(5000);

console.log('\n=== POST REQUESTS ===');
console.log(JSON.stringify(reqs, null, 1));

const body = await page.locator('body').innerText();
console.log('\n=== BODY SNIPPET (1200) ===');
console.log(body.slice(0, 1200));
console.log('\nURL:', page.url());

await browser.close();
