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
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">AI Point</h1>
          <p className="ds-hint">
            Kelola saldo AI Point owner. Fitur AI (Design &amp; Assistance) memotong saldo ini — 1 permintaan = 1 poin.
          </p>
        </div>
      </div>

      {status && (
        <div className="ds-alert items-start" data-tone={status.type === 'success' ? 'ok' : 'bad'}>
          <span className="flex-1">{status.message}</span>
          <button
            onClick={() => setStatus(null)}
            className="ds-btn"
            data-variant="ghost"
            data-size="sm"
            style={{ height: 22, padding: 0, width: 22 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Daftar owner */}
      <div className="ds-card overflow-hidden">
        <div
          className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
          style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={20} style={{ color: '#8b5cf6' }} />
            <h2 className="ds-h2">Saldo Owner</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="ds-icon-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, username, atau email…"
              className="ds-input"
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th className="ds-section-label">Owner</th>
                <th className="ds-section-label">Toko</th>
                <th className="ds-section-label">Point Order</th>
                <th className="ds-section-label">AI Point</th>
                <th className="ds-section-label">AI Terpakai</th>
                <th className="ds-section-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '40px 12px' }}>
                    <Loader2 className="ds-icon-muted mx-auto animate-spin" size={28} />
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div className="ds-empty">
                      <p className="ds-small">Tidak ada owner yang cocok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                owners.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="ds-body" style={{ fontWeight: 600 }}>{o.nama}</div>
                      <div className="ds-caption">{o.email}</div>
                    </td>
                    <td className="ds-body">{o.toko ?? '—'}</td>
                    <td className="ds-num ds-accent-text" style={{ fontWeight: 700 }}>
                      {o.points.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className="ds-num"
                        style={{ fontWeight: 800, color: o.ai_points > 0 ? '#7c3aed' : 'var(--ds-danger)' }}
                      >
                        {o.ai_points.toLocaleString()}
                      </span>
                    </td>
                    <td className="ds-small">{o.ai_terpakai.toLocaleString()} poin</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setTarget(o);
                            setAmount('100');
                            setNote('');
                          }}
                          className="ds-btn-sm"
                          style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}
                        >
                          <Plus size={14} />
                          Tambah
                        </button>
                        <button
                          onClick={() => {
                            setTarget(o);
                            setAmount('-10');
                            setNote('');
                          }}
                          className="ds-btn-sm"
                          data-tone="neutral"
                          style={{ height: 28 }}
                        >
                          <Minus size={14} />
                          Kurangi
                        </button>
                        <button
                          onClick={() => setRiwayatUser(riwayatUser?.id === o.id ? null : o)}
                          className="ds-btn-sm"
                          data-tone="neutral"
                          style={{ height: 28, background: 'transparent', borderColor: 'transparent', color: 'var(--ds-fg-muted)' }}
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
      <div className="ds-card overflow-hidden">
        <div
          className="p-6 flex items-center justify-between gap-4"
          style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
        >
          <h2 className="ds-h2">
            Riwayat AI Point {riwayatUser ? `— ${riwayatUser.nama}` : '(semua owner)'}
          </h2>
          {riwayatUser && (
            <button
              onClick={() => setRiwayatUser(null)}
              className="ds-btn"
              data-variant="secondary"
              data-size="sm"
            >
              Tampilkan semua
            </button>
          )}
        </div>
        <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th className="ds-section-label">Owner</th>
                <th className="ds-section-label">Fitur</th>
                <th className="ds-section-label">Amount</th>
                <th className="ds-section-label">Keterangan</th>
                <th className="ds-section-label text-right">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div className="ds-empty">
                      <p className="ds-small">Belum ada riwayat AI Point.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="ds-body" style={{ fontWeight: 600 }}>
                      {l.user?.full_name ?? `User #${l.user_id}`}
                    </td>
                    <td className="ds-body">
                      {l.feature === 'design'
                        ? 'Design with OmBot AI'
                        : l.feature === 'assistance'
                          ? 'Manage OmBot AI'
                          : 'Saldo manual'}
                    </td>
                    <td>
                      <span
                        className="ds-num"
                        style={{ fontWeight: 800, color: l.amount > 0 ? '#15803d' : 'var(--ds-danger)' }}
                      >
                        {l.amount > 0 ? '+' : ''}
                        {l.amount}
                      </span>
                    </td>
                    <td className="ds-body">{l.note}</td>
                    <td className="ds-caption text-right whitespace-nowrap">
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
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(24, 24, 27, 0.6)' }}
            onClick={() => !saving && setTarget(null)}
          />
          <div
            className="ds-card relative w-full max-w-md p-8"
            style={{ borderRadius: 18, boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <h2 className="ds-h1">
              {Number(amount) < 0 ? 'Kurangi' : 'Tambah'} AI Point
            </h2>
            <p className="ds-small mt-1">
              {target.nama} — saldo sekarang{' '}
              <span style={{ fontWeight: 700, color: '#7c3aed' }}>{target.ai_points}</span>
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="ds-label">Jumlah</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="mis. 100 atau -10"
                  className="ds-input"
                />
                <p className="ds-hint">
                  Angka negatif untuk mengurangi. Saldo tidak boleh jadi minus.
                </p>
              </div>
              <div>
                <label className="ds-label">Catatan</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="mis. Bonus kompensasi gangguan layanan"
                  className="ds-input"
                />
                <p className="ds-hint">Wajib diisi — tercatat di riwayat owner.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={simpan}
                disabled={saving}
                className="ds-btn w-full"
                data-variant="primary"
                style={{ background: '#7c3aed', height: 44 }}
              >
                {saving && <Loader2 className="animate-spin" size={18} />}
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button
                onClick={() => setTarget(null)}
                disabled={saving}
                className="ds-btn w-full"
                data-variant="secondary"
                style={{ height: 40 }}
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
