#!/usr/bin/env bash
# Probe storefront pages. Run against live next dev server.
# Args: BASE_URL (default http://127.0.0.1:3000) HASH (required)
set -uo pipefail
BASE="${1:-http://127.0.0.1:3000}"
HASH="${2:?usage: $0 BASE_URL HASH}"

PAGES=(
  "/storefront/$HASH"
  "/storefront/$HASH/products/PROBE"
  "/storefront/$HASH/cart"
  "/storefront/$HASH/checkout"
  "/storefront/$HASH/sign-in"
  "/storefront/$HASH/orders"
  "/storefront/$HASH/orders/999999"
)

fail=0
for p in "${PAGES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p")
  if [[ "$code" =~ ^(200|307|404)$ ]]; then
    echo "OK   $code  $p"
  else
    echo "FAIL $code  $p"
    fail=1
  fi
done

exit $fail
