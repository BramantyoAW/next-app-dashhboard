/**
 * Cek apakah sebuah host benar-benar melayani halaman.
 *
 * Status `active` di database hanyalah klaim: Cloudflare for SaaS bisa sudah
 * menerbitkan sertifikat sementara apex domain tidak punya record sama sekali
 * (yang terjadi pada demostore-ombot.my.id). Karena itu kelayakan domain
 * diputuskan dari hasil permintaan HTTP, bukan dari kolom status.
 */

export type ProbeResult = {
  host: string;
  ok: boolean;
  code: number | null;
};

export type DomainProbe = {
  apex: ProbeResult;
  www: ProbeResult;
  /** Host yang benar-benar menjawab, prioritas apex lalu www. */
  live: string | null;
};

export async function probeHost(host: string, timeoutMs = 6000): Promise<ProbeResult> {
  try {
    const res = await fetch(`https://${host}/`, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { host, ok: res.ok, code: res.status };
  } catch {
    return { host, ok: false, code: null };
  }
}

/** Probe apex dan www sekaligus; registrar sering menolak CNAME di root. */
export async function probeDomain(domain: string): Promise<DomainProbe> {
  const [apex, www] = await Promise.all([probeHost(domain), probeHost(`www.${domain}`)]);
  return { apex, www, live: apex.ok ? domain : www.ok ? `www.${domain}` : null };
}
