/**
 * Customer JWT lives in cookie `customer_token` + localStorage `customer_token`.
 * Mirrors the dashboard dual-storage pattern.
 */
const KEY = 'customer_token';

export function setCustomerToken(token: string): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${KEY}=${token}; path=/; SameSite=Lax; max-age=604800`;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, token);
  }
}

export function clearCustomerToken(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${KEY}=; path=/; max-age=0`;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(KEY);
  }
}

export function getCustomerToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    const t = localStorage.getItem(KEY);
    if (t) return t;
  }
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(new RegExp(`${KEY}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}
