'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { gqlFetch } from '@/lib/graphqlClient';
import { Truck, CheckCircle2, XCircle, Info, Plug } from 'lucide-react';

/**
 * Pengaturan ongkir ekspedisi (RajaOngkir) tingkat platform.
 *
 * Kuncinya MILIK PLATFORM, bukan milik merchant. Administrator mengisi sekali di
 * sini, lalu setiap merchant yang mengaktifkan metode "Ekspedisi" otomatis
 * memakainya — merchant tidak pernah melihat kunci ini. Karena itu halaman ini
 * hanya untuk admin, dan backend menolak siapa pun selain admin.
 */
export default function RajaOngkirSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; reason?: string | null } | null>(null);

  const [settings, setSettings] = useState({ rajaongkir_api_key: '' });
  // Nilai yang sudah tersimpan, untuk membedakan "kunci belum pernah diisi"
  // dari "kunci ada tapi tidak berubah". Tanpa ini, halaman akan menyimpan
  // string kosong saat admin hanya ingin mengubah hal lain.
  const [kunciTersimpan, setKunciTersimpan] = useState('');
  const [adaKunci, setAdaKunci] = useState(false);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await adminGetAppSettingsService(token);
      const item = res.appSettings.find((s: any) => s.key === 'rajaongkir_api_key');

      if (item?.value) {
        setKunciTersimpan(item.value);
        setAdaKunci(true);
        // Kunci tidak pernah ditampilkan utuh di layar, bahkan kepada admin.
        // Yang ditampilkan hanya petunjuk bahwa ia sudah terpasang.
        setSettings({ rajaongkir_api_key: '' });
      }
      setLoading(false);
    } catch {
      setStatus({ type: 'error', message: 'Gagal memuat pengaturan.' });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // Sengaja hanya sekali saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Kunci yang akan dipakai: yang baru diketik, atau yang tersimpan. */
  const kunciAktif = settings.rajaongkir_api_key.trim() || kunciTersimpan;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await gqlFetch<{
        testRajaOngkirConnection: { ok: boolean; message: string; reason?: string | null };
      }>(
        `mutation($k: String) { testRajaOngkirConnection(api_key: $k) { ok message reason } }`,
        // Kunci yang baru diketik diuji LANGSUNG, sebelum disimpan, supaya
        // administrator tidak perlu menyimpan kunci yang mungkin salah.
        { k: settings.rajaongkir_api_key.trim() || null },
        token,
      );

      setTestResult(res.testRajaOngkirConnection);
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Gagal menguji koneksi.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (!kunciAktif) {
        setStatus({ type: 'error', message: 'Isi kunci API terlebih dahulu.' });
        return;
      }

      await adminUpsertAppSettingsService(token, [
        { key: 'rajaongkir_api_key', value: kunciAktif, type: 'string' },
      ]);

      setKunciTersimpan(kunciAktif);
      setAdaKunci(true);
      setSettings({ rajaongkir_api_key: '' });
      setStatus({ type: 'success', message: 'Kunci tersimpan. Merchant bisa memakai metode Ekspedisi sekarang.' });
      setTimeout(() => setStatus(null), 6000);
    } catch {
      setStatus({ type: 'error', message: 'Gagal menyimpan kunci.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Truck size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ongkir Ekspedisi</h1>
          <p className="text-sm text-muted-foreground">
            Satu kunci untuk seluruh platform. Merchant tidak perlu mengisi apa pun.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3.5 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1.5 text-muted-foreground">
            <p>
              Merchant yang mengaktifkan metode <span className="font-mono font-semibold">Ekspedisi</span> otomatis
              memakai kunci ini. Mereka tidak pernah melihat maupun mengisinya.
            </p>
            <p>
              Paket <strong>Starter (gratis)</strong> memberi 100 hit/hari{' '}
              <strong>untuk seluruh platform</strong>, dan satu perhitungan tarif memakai satu hit per kurir. Karena itu
              bawaan sistem hanya 1 kurir, dan tiap metode dibatasi maksimal 2 kurir. Bila kuota habis, metode flat dan
              kirim instan tetap berjalan — checkout tidak pernah berhenti.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">API Key RajaOngkir</label>
              <input
                type="password"
                name="rajaongkir_api_key"
                value={settings.rajaongkir_api_key}
                onChange={(e) => setSettings({ rajaongkir_api_key: e.target.value })}
                placeholder={adaKunci ? '••••••••  (kunci sudah terpasang — isi hanya bila ingin mengganti)' : 'Tempel API key dari dashboard RajaOngkir'}
                className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Kunci disimpan di server dan tidak ditampilkan kembali di layar ini.
              </p>
            </div>

            {adaKunci && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0" />
                Kunci sudah terpasang. Merchant bisa memakai ongkir ekspedisi.
              </div>
            )}

            {testResult && (
              <div
                className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
                  testResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <div>
                  <p>{testResult.message}</p>
                  {/* Alasan dibedakan karena tindak lanjutnya berbeda: kunci
                      salah perlu diganti, kuota habis cukup ditunggu. */}
                  {testResult.reason === 'kuota' && (
                    <p className="mt-1 text-xs opacity-80">Tunggu sampai kuota harian pulih, lalu coba lagi.</p>
                  )}
                  {testResult.reason === 'belum_dikonfigurasi' && (
                    <p className="mt-1 text-xs opacity-80">Periksa kembali kunci dari dashboard RajaOngkir.</p>
                  )}
                </div>
              </div>
            )}

            {status && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-sm ${
                  status.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving || !kunciAktif}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan kunci'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !kunciAktif}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                <Plug size={15} />
                {testing ? 'Menguji…' : 'Uji koneksi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
