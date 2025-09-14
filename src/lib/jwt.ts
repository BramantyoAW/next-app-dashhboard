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
  