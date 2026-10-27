import { NextRequest, NextResponse } from 'next/server';
import { probeDomain } from '@/lib/domainProbe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/domain-status?host=contoh.com
 *
 * Dipakai panel Domain Kustom untuk menandai apakah domain merchant benar-benar
 * bisa dibuka pembeli. Probe dilakukan dari server karena browser merchant
 * sering berada di jaringan yang memblokir atau meng-cache hasil DNS.
 */
export async function GET(req: NextRequest) {
  const host = (req.nextUrl.searchParams.get('host') || '').trim().toLowerCase();

  if (!/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(host)) {
    return NextResponse.json({ error: 'Host tidak valid' }, { status: 400 });
  }

  const probe = await probeDomain(host);
  return NextResponse.json({ host, ...probe, checkedAt: new Date().toISOString() });
}
