export function decodeJwt(token: string): any | null {
    try {
      const part = token.split('.')[1];
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + (4 - (part.length % 4)) % 4, '='));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  
  export function extractStoreId(token: string | null): number | null {
    if (!token) return null;
    const p = decodeJwt(token);
    const v = p?.store_id;
    return typeof v === 'number' ? v : (v ? Number(v) : null);
  }

  export function extractStoreRole(token: string | null): string | null {
    if (!token) return null;
    const p = decodeJwt(token);
    return p?.store_role ?? null;
  }

  /**
   * Store id "aktif" di dashboard tunggal (tanpa switch store global).
   * Prioritas: localStorage activeStoreId (pilihan user per sesi) → JWT store_id (fallback lama).
   * Dipakai oleh halaman-halaman yang butuh store id tanpa dropdown sendiri.
   */
  export function getActiveStoreId(token: string | null): number | null {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('activeStoreId');
      const n = saved ? Number(saved) : NaN;
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return extractStoreId(token);
  }
  