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
        <div
          className="animate-spin h-8 w-8 border-4 rounded-full"
          style={{ borderColor: 'var(--ds-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="ds-display">Midtrans Configuration</h1>
          <p className="ds-small mt-1">Integrasi payment gateway untuk sistem Top-up merchant</p>
        </div>

        {status && (
          <div
            data-tone={status.type === 'success' ? 'ok' : 'bad'}
            className="ds-alert animate-in fade-in slide-in-from-top-4 duration-300"
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="ds-body font-semibold">{status.message}</span>
          </div>
        )}
      </div>

      <div className="ds-card overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="ds-subcard flex items-center justify-between" style={{ padding: 20 }}>
              <div className="space-y-1">
                <p className="ds-h2">
                  {settings.midtrans_active === '1' ? 'Midtrans Active' : 'Midtrans Inactive'}
                </p>
                <p className="ds-small">Enable or disable Midtrans payment</p>
              </div>
              <button 
                type="button"
                onClick={() => toggleSetting('midtrans_active')}
                className="focus:outline-none transition-transform active:scale-95"
              >
                {settings.midtrans_active === '1' ? (
                  <ToggleRight size={48} className="ds-accent-text" />
                ) : (
                  <ToggleLeft size={48} className="ds-icon-muted" />
                )}
              </button>
            </div>

            <div className="ds-subcard flex items-center justify-between" style={{ padding: 20 }}>
              <div className="space-y-1">
                <p className="ds-h2">
                  {settings.midtrans_is_production === '1' ? 'Production Mode' : 'Sandbox Mode'}
                </p>
                <p className="ds-small">Toggle between Sandbox and Production</p>
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
              <label className="ds-label">Merchant ID</label>
              <input
                type="text"
                name="midtrans_merchant_id"
                className="ds-input ds-mono"
                value={settings.midtrans_merchant_id}
                onChange={handleChange}
                placeholder="M531568560"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-label">Client Key</label>
              <input
                type="text"
                name="midtrans_client_key"
                className="ds-input ds-mono"
                value={settings.midtrans_client_key}
                onChange={handleChange}
                placeholder="SB-Mid-client-..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-label">Server Key</label>
              <input
                type="password"
                name="midtrans_server_key"
                className="ds-input ds-mono"
                value={settings.midtrans_server_key}
                onChange={handleChange}
                placeholder="SB-Mid-server-..."
              />
            </div>
          </div>

          <div className="ds-well flex gap-3" data-tone="accent">
              <Info className="w-5 h-5 ds-accent-text shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="ds-body font-semibold">Snap Notification Webhook</p>
                <p className="ds-caption leading-relaxed">
                  Pastikan Anda telah mengatur URL Notification di dashboard Midtrans ke: 
                  <code className="ds-mono ml-1">https://domain-anda.com/api/midtrans-webhook</code>
                </p>
              </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            data-variant="primary"
            className="ds-btn w-full"
          >
            {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Midtrans'}
          </button>
        </form>
      </div>
    </div>
  );
}
