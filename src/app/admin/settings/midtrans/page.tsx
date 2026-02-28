'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { CreditCard, ShieldCheck, CheckCircle2, XCircle, Info, ToggleLeft, ToggleRight } from 'lucide-react';

export default function MidtransSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [settings, setSettings] = useState({
    midtrans_active: '0',
    midtrans_is_production: '0',
    midtrans_merchant_id: '',
    midtrans_client_key: '',
    midtrans_server_key: '',
  });

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await adminGetAppSettingsService(token);
      const fetchedSettings = res.appSettings;
      
      const newSettings = { ...settings };
      fetchedSettings.forEach((item: any) => {
        if (Object.keys(newSettings).includes(item.key)) {
          (newSettings as any)[item.key] = item.value;
        }
      });
      setSettings(newSettings);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to load settings.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const input = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value.toString(),
        type: 'string',
      }));

      await adminUpsertAppSettingsService(token, input);
      setStatus({ type: 'success', message: 'Midtrans settings saved successfully!' });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key as keyof typeof settings] === '1' ? '0' : '1'
    }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Midtrans Configuration</h1>
          <p className="text-slate-500 mt-1">Integrasi payment gateway untuk sistem Top-up merchant</p>
        </div>

        {status && (
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 border ${
            status.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-100'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="font-bold text-sm">{status.message}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-lg">
                  {settings.midtrans_active === '1' ? 'Midtrans Active' : 'Midtrans Inactive'}
                </p>
                <p className="text-sm text-slate-500">Enable or disable Midtrans payment</p>
              </div>
              <button 
                type="button"
                onClick={() => toggleSetting('midtrans_active')}
                className="focus:outline-none transition-transform active:scale-95"
              >
                {settings.midtrans_active === '1' ? (
                  <ToggleRight size={48} className="text-blue-600" />
                ) : (
                  <ToggleLeft size={48} className="text-slate-300" />
                )}
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-lg">
                  {settings.midtrans_is_production === '1' ? 'Production Mode' : 'Sandbox Mode'}
                </p>
                <p className="text-sm text-slate-500">Toggle between Sandbox and Production</p>
              </div>
              <button 
                type="button"
                onClick={() => toggleSetting('midtrans_is_production')}
                className="focus:outline-none transition-transform active:scale-95"
              >
                {settings.midtrans_is_production === '1' ? (
                  <ToggleRight size={48} className="text-emerald-600" />
                ) : (
                  <ToggleLeft size={48} className="text-orange-400" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Merchant ID</label>
              <input
                type="text"
                name="midtrans_merchant_id"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono"
                value={settings.midtrans_merchant_id}
                onChange={handleChange}
                placeholder="M531568560"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Key</label>
              <input
                type="text"
                name="midtrans_client_key"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono"
                value={settings.midtrans_client_key}
                onChange={handleChange}
                placeholder="SB-Mid-client-..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Key</label>
              <input
                type="password"
                name="midtrans_server_key"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono"
                value={settings.midtrans_server_key}
                onChange={handleChange}
                placeholder="SB-Mid-server-..."
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-950">Snap Notification Webhook</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Pastikan Anda telah mengatur URL Notification di dashboard Midtrans ke: 
                  <code className="bg-white/50 px-2 py-0.5 rounded ml-1 font-bold">https://domain-anda.com/api/midtrans-webhook</code>
                </p>
              </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Midtrans'}
          </button>
        </form>
      </div>
    </div>
  );
}
