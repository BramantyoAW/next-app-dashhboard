'use client';

const COOKIE_NAME = 'ombot_token';
const LOCALSTORAGE_KEY = 'token';
const ONE_DAY = 60 * 60 * 24;

function setCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Persist JWT to BOTH localStorage (legacy `token` key) AND the `ombot_token`
 * cookie read by `middleware.ts` and `(dashboard)/layout.tsx`. Until every
 * reader migrates to a single source of truth, both must stay in sync.
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALSTORAGE_KEY, token);
  setCookie(COOKIE_NAME, token, ONE_DAY);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCALSTORAGE_KEY);
  clearCookie(COOKIE_NAME);
}

/**
 * Client-side helper. Returns the token from cookie or localStorage.
 * Used to lazy-hydrate the cookie at app boot, so server-side guards
 * (middleware + (dashboard)/layout) stop redirecting to /login when
 * only localStorage is populated.
 */
export function getAuthTokenFromBrowser(): string | null {
  if (typeof document === 'undefined') return null;
  const cookieMatch = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];
  if (cookieMatch) return cookieMatch;
  const ls = localStorage.getItem(LOCALSTORAGE_KEY);
  if (ls) {
    // Mirror to cookie so subsequent navigations pass middleware + layout guards.
    setCookie(COOKIE_NAME, ls, ONE_DAY);
  }
  return ls;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_LOCALSTORAGE_KEY = LOCALSTORAGE_KEY;
