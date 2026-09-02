'use client';

import React, { useEffect, useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';
import { myStoresService, type MyStore } from '@/graphql/query/myStores';
import { toast } from 'sonner';
import { Store, MapPin, Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const UPDATE_STORE = `
  mutation UpdateStore($id: ID!, $name: String, $address: String, $phone: String) {
    updateStore(id: $id, name: $name, address: $address, phone: $phone) {
      id
      name
      address
      phone
    }
  }
`;

export default function OwnerStoresPage() {
  const [stores, setStores] = useState<MyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    loadStores();
  }, [token]);

  async function loadStores() {
    try {
      const res = await myStoresService(token!);
      setStores(res.myStores ?? []);
    } catch (e: any) {
      toast.error('Gagal memuat data outlet');
    } finally {
      setLoading(false);
    }
  }

  async function updateStore(store: MyStore) {
    setSaving(String(store.id));
    setStatus(null);
    try {
      await gqlFetch(
        UPDATE_STORE,
        { id: store.id, name: store.name, address: store.address, phone: store.phone },
        token!
      );
      setStatus({ kind: 'ok', msg: `Outlet "${store.name}" berhasil diperbarui!` });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan' });
    } finally {
      setSaving(null);
    }
  }

  function updateField(id: number, field: keyof MyStore, value: string) {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Outlet Saya</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola alamat dan informasi setiap outlet. Alamat outlet ditampilkan saat customer memilih "Ambil di Outlet".
        </p>
      </div>

      {status && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
          status.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {status.kind === 'ok' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {status.msg}
        </div>
      )}

      <div className="space-y-4">
        {stores.map((store) => (
          <div key={store.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Store size={20} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">{store.name}</h3>
                <p className="text-xs text-slate-400">ID: {store.id}</p>
              </div>
              <button
                onClick={() => updateStore(store)}
                disabled={saving === String(store.id)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-50"
              >
                {saving === String(store.id) ? <Loader2 className="animate-spin inline" size={14} /> : 'Simpan'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  <MapPin size={12} className="inline mr-1" />
                  Alamat Outlet
                </label>
                <textarea
                  rows={3}
                  value={store.address ?? ''}
                  onChange={(e) => updateField(store.id, 'address', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jl. Malioboro No. 1, Yogyakarta"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alamat lengkap akan ditampilkan di halaman checkout "Ambil di Outlet".
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  <Phone size={12} className="inline mr-1" />
                  Telepon Outlet
                </label>
                <input
                  value={store.phone ?? ''}
                  onChange={(e) => updateField(store.id, 'phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="08123456789"
                />
              </div>
            </div>
          </div>
        ))}

        {stores.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            Tidak ada outlet ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}
