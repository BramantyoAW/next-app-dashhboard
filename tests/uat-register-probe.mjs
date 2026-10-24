import { chromium } from 'playwright';

const BASE = 'https://demostore.om-bot.com';
const results = [];
function rec(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// capture graphql traffic
const gql = [];
page.on('response', async (r) => {
  if (r.url().includes('/graphql')) {
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch {}
    gql.push({ status: r.status(), ct: r.headers()['content-type'] || '', body });
  }
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
const consoleErrs = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

async function go(path) {
  const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  return resp ? resp.status() : 0;
}

// ---------- 1. sign-in page ----------
let st = await go('/sign-in');
rec('sign-in page loads', st === 200, `HTTP ${st}`);
await page.waitForTimeout(2000);

const bodyText = await page.locator('body').innerText().catch(() => '');
rec('sign-in renders form', /masuk|login|daftar|register/i.test(bodyText), bodyText.slice(0, 120).replace(/\n/g, ' | '));

// find register toggle
const regToggle = page.locator('button, a').filter({ hasText: /daftar|register|buat akun/i }).first();
const hasToggle = await regToggle.count() > 0;
rec('register toggle visible', hasToggle);
if (hasToggle) { await regToggle.click(); await page.waitForTimeout(1200); }

const inputs = await page.locator('input').evaluateAll((els) =>
  els.map((e) => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id }))
);
console.log('INPUTS:', JSON.stringify(inputs));

// ---------- 2. register negative: duplicate phone ----------
const ts = Date.now();
const email = `pw.${ts}@example.com`;
const phone = '08' + String(ts).slice(-9);

async function fill(field, value) {
  const el = page.locator(`input[name="${field}"], input[placeholder*="${field}" i], input[type="${field}"]`).first();
  if (await el.count()) { await el.fill(value); return true; }
  return false;
}

// dump structure for the first attempt
const formHtml = await page.locator('form').first().innerHTML().catch(() => '');
console.log('FORM_HTML_LEN', formHtml.length);
console.log('FORM_HTML', formHtml.slice(0, 1500));

await browser.close();
console.log('\nGQL_CALLS', JSON.stringify(gql, null, 1));
console.log('PAGE_ERRORS', JSON.stringify(pageErrors));
console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrs.slice(0, 5)));
