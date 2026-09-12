'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Minus, Plus, Search, Sparkles, X } from 'lucide-react';
import {
  adminAdjustAiPointsService,
  getAdminAiPointHistoriesService,
  getAdminAiPointOwnersService,
  type AdminAiPointOwner,
  type AiPointLog,
} from '@/graphql/adminAiPoints';

/**
 * Admin — kelola AI Point owner.
 *
 * AI Point terpisah dari poin order: fitur AI (Design with OmBot AI & OmBot AI
 * Assistance) memotong saldo ini. Admin bisa menambah maupun mengurangi, dan
 * setiap perubahan tercatat di riwayat agar bisa ditelusuri.
 */
export default function AdminAiPointsPage() {
  const router = useRouter();
  const [owners, setOwners] = useState<AdminAiPointOwner[]>([]);
  const [logs, setLogs] = useState<AiPointLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal penyesuaian saldo.
  const [target, setTarget] = useState<AdminAiPointOwner | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  // Filter riwayat: null = semua owner.
  const [riwayatUser, setRiwayatUser] = useState<AdminAiPointOwner | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const [ownersRes, logsRes] = await Promise.all([
        getAdminAiPointOwnersService(token, search, 1, 50),
        getAdminAiPointHistoriesService(token, riwayatUser?.id ?? null, 1, 20),
      ]);
      setOwners(ownersRes.adminAiPointOwners?.data ?? []);
      setLogs(logsRes.adminAiPointHistories?.data ?? []);
    } catch {
      setStatus({ type: 'error', message: 'Gagal memuat data AI Point.' });
    } finally {
      setLoading(false);
    }
  }, [router, search, riwayatUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function simpan() {
    if (!target) return;
    const nilai = Number(amount);
    if (!nilai) {
      setStatus({ type: 'error', message: 'Jumlah tidak boleh 0.' });
      return;
    }
    if (!note.trim()) {
      setStatus({ type: 'error', message: 'Catatan wajib diisi.' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    setStatus(null);
    try {
      const res = await adminAdjustAiPointsService(token, {
        user_id: target.id,
        amount: nilai,
        note: note.trim(),
      });
      const saldo = res.adminAdjustAiPoints?.ai_points;
      setStatus({
        type: 'success',
        message: `${nilai > 0 ? 'Ditambah' : 'Dikurangi'} ${Math.abs(nilai)} AI Point untuk ${target.nama}. Saldo sekarang: ${saldo}.`,
      });
      setTarget(null);
      setAmount('');
      setNote('');
      await load();
    } catch (e) {
      setStatus({
        type: 'error',
        message: e instanceof Error ? e.message : 'Gagal mengubah AI Point.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Point</h1>
        <p className="text-slate-500 mt-1">
          Kelola saldo AI Point owner. Fitur AI (Design &amp; Assistance) memotong saldo ini — 1 permintaan = 1 poin.
        </p>
      </div>

      {status && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <span className="flex-1">{status.message}</span>
          <button onClick={() => setStatus(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Daftar owner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-violet-500" />
            <h2 className="font-bold text-slate-900">Saldo Owner</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, username, atau email…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Toko</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Point Order</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">AI Point</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">AI Terpakai</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto animate-spin text-slate-300" size={28} />
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Tidak ada owner yang cocok.
                  </td>
                </tr>
              ) : (
                owners.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{o.nama}</div>
                      <div className="text-xs text-slate-400">{o.email}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{o.toko ?? '—'}</td>
                    <td className="px-6 py-5 font-bold text-blue-600">{o.points.toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <span className={`font-black ${o.ai_points > 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                        {o.ai_points.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">{o.ai_terpakai.toLocaleString()} poin</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setTarget(o);
                            setAmount('100');
                            setNote('');
                          }}
                          className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100"
                        >
                          <Plus size={14} className="mr-1 inline" />
                          Tambah
                        </button>
                        <button
                          onClick={() => {
                            setTarget(o);
                            setAmount('-10');
                            setNote('');
                          }}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        >
                          <Minus size={14} className="mr-1 inline" />
                          Kurangi
                        </button>
                        <button
                          onClick={() => setRiwayatUser(riwayatUser?.id === o.id ? null : o)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100"
                        >
                          Riwayat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-900">
            Riwayat AI Point {riwayatUser ? `— ${riwayatUser.nama}` : '(semua owner)'}
          </h2>
          {riwayatUser && (
            <button
              onClick={() => setRiwayatUser(null)}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              Tampilkan semua
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fitur</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Belum ada riwayat AI Point.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                      {l.user?.full_name ?? `User #${l.user_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {l.feature === 'design'
                        ? 'Design with OmBot AI'
                        : l.feature === 'assistance'
                          ? 'OmBot AI Assistance'
                          : 'Saldo manual'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-black ${l.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {l.amount > 0 ? '+' : ''}
                        {l.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{l.note}</td>
                    <td className="px-6 py-4 text-right text-xs whitespace-nowrap text-slate-500">
                      {new Intl.DateTimeFormat('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }).format(new Date(l.created_at))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal penyesuaian saldo */}
      {target && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !saving && setTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900">
              {Number(amount) < 0 ? 'Kurangi' : 'Tambah'} AI Point
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {target.nama} — saldo sekarang{' '}
              <span className="font-bold text-violet-600">{target.ai_points}</span>
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="mis. 100 atau -10"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Angka negatif untuk mengurangi. Saldo tidak boleh jadi minus.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Catatan</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="mis. Bonus kompensasi gangguan layanan"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">Wajib diisi — tercatat di riwayat owner.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={simpan}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 font-bold text-white transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50"
              >
                {saving && <Loader2 className="animate-spin" size={18} />}
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button
                onClick={() => setTarget(null)}
                disabled={saving}
                className="w-full rounded-2xl bg-slate-50 py-3 font-bold text-slate-400 transition-all hover:bg-slate-100"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
