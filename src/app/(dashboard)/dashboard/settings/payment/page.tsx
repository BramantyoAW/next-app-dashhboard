'use client';

import React, { useEffect, useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

type PaymentSetting = {
  id: string;
  name: string;
  type: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  instructions: string | null;
  is_free: boolean;
  enabled: boolean;
};

export default function OwnerPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    loadSettings();
  }, [token]);

  async function loadSettings() {
    try {
      const data = await gqlFetch<{ ownerPaymentSettings: PaymentSetting[] }>(
        `query { ownerPaymentSettings { id name type bank_name account_number account_name instructions is_free enabled } }`,
        {},
        token!
      );
      setSettings(data.ownerPaymentSettings ?? []);
    } catch (e: any) {
      toast.error('Gagal memuat pengaturan pembayaran');
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(setting: PaymentSetting) {
    setSaving(true);
    setStatus(null);
    try {
      await gqlFetch(
        `mutation($i: OwnerPaymentSettingInput!) { upsertOwnerPaymentSetting(input: $i) { id } }`,
        { i: { ...setting } },
        token!
      );
      setStatus({ kind: 'ok', msg: 'Pengaturan pembayaran berhasil disimpan!' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSetting(id: string) {
    if (!confirm('Hapus metode pembayaran ini?')) return;
    setSaving(true);
    try {
      await gqlFetch(
        `mutation($id: ID!) { deleteOwnerPaymentSetting(id: $id) }`,
        { id },
        token!
      );
      setSettings(prev => prev.filter(s => s.id !== id));
      toast.success('Berhasil dihapus');
    } catch (e: any) {
      toast.error('Gagal menghapus');
    } finally {
      setSaving(false);
    }
  }

  function addNew() {
    setSettings(prev => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        name: '',
        type: 'bank_transfer',
        bank_name: null,
        account_number: null,
        account_name: null,
        instructions: null,
        is_free: true,
        enabled: true,
      },
    ]);
  }

  function updateField(idx: number, field: keyof PaymentSetting, value: any) {
    setSettings(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
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
        <h1 className="text-2xl font-extrabold text-slate-900">Pengaturan Pembayaran</h1>
        <p className="text-sm text-slate-500 mt-1">
          Atur metode pembayaran di level owner. Semua web store dan POS akan menggunakan pengaturan ini.
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
        {settings.map((s, idx) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CreditCard size={16} className="text-slate-400" />
                Metode #{idx + 1}
                <label className="ml-2 flex items-center gap-1 text-xs text-slate-500">
                  <input type="checkbox" checked={s.enabled} onChange={e => updateField(idx, 'enabled', e.target.checked)} />
                  Aktif
                </label>
              </div>
              <button
                onClick={() => deleteSetting(s.id)}
                className="text-xs text-rose-500 hover:underline"
              >
                Hapus
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Nama (cth: Bank BCA)"
                value={s.name}
                onChange={e => updateField(idx, 'name', e.target.value)}
              />
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={s.type}
                onChange={e => updateField(idx, 'type', e.target.value)}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cod">COD</option>
                <option value="midtrans">Midtrans</option>
              </select>

              {s.type !== 'cod' && (
                <>
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Bank / Provider"
                    value={s.bank_name ?? ''}
                    onChange={e => updateField(idx, 'bank_name', e.target.value)}
                  />
                  <input
                    className="rounded-lg border px-3 py-2 text-sm"
                    placeholder="Nomor rekening / ID"
                    value={s.account_number ?? ''}
                    onChange={e => updateField(idx, 'account_number', e.target.value)}
                  />
                  <input
                    className="col-span-2 rounded-lg border px-3 py-2 text-sm"
                    placeholder="Atas nama (opsional)"
                    value={s.account_name ?? ''}
                    onChange={e => updateField(idx, 'account_name', e.target.value)}
                  />
                </>
              )}

              <input
                className="col-span-2 rounded-lg border px-3 py-2 text-sm"
                placeholder="Instruksi tambahan (opsional)"
                value={s.instructions ?? ''}
                onChange={e => updateField(idx, 'instructions', e.target.value)}
              />
            </div>
          </div>
        ))}

        <button
          onClick={addNew}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Tambah Metode Pembayaran
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => settings.forEach(s => saveSetting(s))}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
          Simpan Semua
        </button>
      </div>
    </div>
  );
}
