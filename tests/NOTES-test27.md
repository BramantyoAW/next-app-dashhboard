# Petunjuk Fix Test 27 (Checkout submit flaky) — E2E storefront

## Status FINAL (2026-08-29)
- `fe/tests/storefront-e2e.mjs` → **33/33 PASS** (test 27 di-skip sengaja).
- Test 27 (UI submit checkout) **dilewati**; order untuk test 28–30 dibuat via GraphQL API
  (independen dari flakiness UI). Perintah user: "skip 27, berikan petunjuk test 27 dan lanjutkan 28–30".
- BUG REAL yang ditemukan & diperbaiki selama sesi ini:
  - **`be/graphql/schema.graphql`**: `type Customer` tidak punya field `orders`
    → halaman `/storefront/{hash}/orders` selalu "Belum ada pesanan" (query invalid).
    Fix: tambah `orders: [Order!]! @hasMany(relation: "orders")`. (Setara commerce.graphql lama.)
  - **`fe/src/components/storefront/SignInForm.tsx`**: mutasi pakai nama lama
    `loginCustomer/registerCustomer` + `LoginCustomerInput/RegisterCustomerInput`;
    schema aktif pakai `customerLogin/customerRegister` + `CustomerLoginInput/CustomerRegisterInput`.
    Fix: samakan dengan schema aktif. (Register/login pembeli tadinya selalu gagal.)
  - **`fe/src/components/storefront/CheckoutForm.tsx`**: `shipping_address.is_default` dikirim
    tapi `ShippingAddressInput` tidak punya field itu → GraphQL error → order gagal. Fix: hapus field.
  - **E2E cookie**: `page.context().addCookies({url})` tidak terbawa SSR untuk domain `toko-cupelis.lvh.me`;
    harus pakai `{domain: 'toko-cupelis.lvh.me'}` eksplisit.
  - **`storefrontProducts`** return `[StoreProduct!]!` (bukan paginator), field produk = `id` (bukan `store_product_id`).

## Test 27 yang di-skip (untuk fix di kemudian hari)
- Bagian UI submit checkout: `coForm.locator('button[type="submit"]').click()`.
- Flaky karena race React state (payment_methods fetch async + re-render belum settle saat submit).
- Fix terbukti (di debug terpisah):
```js
// Setelah coForm.waitFor(visible) + isi field:
const pm = coForm.locator('input[name="pm"]');
await pm.first().waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(2000); // kunci: beri React waktu settle
await coForm.locator('button[type="submit"]').click(); // real click, bukan fiber onSubmit
await page.waitForTimeout(7000);
```
- Jangan invoke `form[key].onSubmit(...)` via fiber — closure state bisa stale ("wajib diisi" palsu).

## Setup untuk run
- Backend: `cd be && export PATH="/opt/homebrew/opt/php@8.3/bin:$PATH" && php artisan serve --host=127.0.0.1 --port=8000`
- Next: `cd fe && npm run dev`
- Run: `node tests/storefront-e2e.mjs`
- Env override: `SF_BASE`, `SF_HASH` (default toko-cupelis).

