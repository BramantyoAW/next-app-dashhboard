'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWebStoreByOwner } from '@/graphql/query/webstore';
import { listMasterProducts } from '@/graphql/query/webstore';
import type { WebStore, MasterProduct, Paginated } from '@/graphql/query/webstore';
import { decodeJwt } from '@/lib/jwt';
import { Globe, Package, Layers, ShoppingCart } from 'lucide-react';
import { WebStoreStatusBadge } from '@/components/web-store/WebStoreStatusBadge';

export default function OwnerOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [webStore, setWebStore] = useState<WebStore | null>(null);
  const [masterCount, setMasterCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = typeof window === 'undefined' ? '' : localStorage.getItem('token') || '';
      if (!token) { setError('Not authenticated'); setLoading(false); return; }
      try {
        const payload = decodeJwt(token);
        const ownerId = payload?.sub ?? payload?.id ?? null;
        const res = await listMasterProducts(token, { page: 1, limit: 1 });
        const wsRes = webStore && (webStore as any).store_id
          ? null
          : ownerId
            ? await getWebStoreByOwner(String(ownerId), token)
            : null;
        if (cancelled) return;
        setMasterCount(res.masterProducts.total);
        setWebStore(wsRes?.webStoreByOwner ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ringkasan Owner</h1>
        <p className="text-sm text-slate-500 mt-1">
          Semua toko Anda dalam satu tempat. Atur web store, master catalog, dan stok lintas store.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={<Globe className="text-blue-600" />} label="Web Store" value={webStore ? webStore.store_name : 'Belum dibuat'} sub={webStore ? <WebStoreStatusBadge active={webStore.is_active} /> : <span className="text-xs text-amber-600 font-semibold">Setup dibutuhkan</span>} />
          <SummaryCard icon={<Package className="text-indigo-600" />} label="Master Products" value={masterCount.toString()} sub={<span className="text-xs text-slate-500">Lintas toko</span>} />
          <SummaryCard icon={<Layers className="text-emerald-600" />} label="Stock per Outlet" value="Kelola" sub={<Link href="/dashboard/catalog/inventory" className="text-xs text-blue-600 font-semibold hover:underline">Buka di Merchant →</Link>} />
          <SummaryCard icon={<ShoppingCart className="text-amber-600" />} label="Orders" value="Soon" sub={<span className="text-xs text-slate-400">Aggregated di Phase 2</span>} />
        </div>
      )}

      {!loading && !webStore && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Web Store belum dibuat</h3>
            <p className="text-sm text-slate-500 mt-1">
              Buat web store dulu untuk menampilkan produk ke pelanggan.
            </p>
          </div>
          <Link
            href="/owner/web-store"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Setup Web Store
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-black text-slate-900 truncate">{value}</div>
      <div className="mt-2">{sub}</div>
    </div>
  );
}
