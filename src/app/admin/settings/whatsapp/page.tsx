'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { Phone, CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react';

export default function WhatsappSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    whatsapp_session: '',
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
      setStatus({ type: 'success', message: 'WhatsApp settings saved successfully!' });
      
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="ds-display">WhatsApp Configuration</h1>
          <p className="ds-small mt-1">Integrasi wwebjs-services untuk pengiriman notifikasi via WhatsApp</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="ds-label">WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp_number"
                className="ds-input ds-mono"
                value={settings.whatsapp_number}
                onChange={handleChange}
                placeholder="6281234567890"
              />
              <p className="ds-hint">Nomor pengirim default (format: 628...)</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="ds-label">Session Name</label>
              <input
                type="text"
                name="whatsapp_session"
                className="ds-input ds-mono"
                value={settings.whatsapp_session}
                onChange={handleChange}
                placeholder="store1"
              />
              <p className="ds-hint">Nama session yang terdaftar di wwebjs</p>
            </div>

            </div>

          <button
            type="submit"
            disabled={saving}
            data-variant="primary"
            className="ds-btn w-full"
          >
            {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi WhatsApp'}
          </button>
        </form>
      </div>

      {/* WWebJS Proxy Iframe */}
      <div className="mt-8 space-y-4">
        <h2 className="ds-h1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-500" />
            WWebJS Services Management
          </div>
        </h2>
        
        <div
          className="ds-well flex gap-3"
          style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}
        >
            <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="ds-body font-semibold">Proxy ke Container wwebjs-services</p>
              <p className="ds-caption leading-relaxed">
                Di bawah ini adalah tampilan langsung dari microservice wwebjs. Anda bisa scan QR, melihat log pesan, dan mereset session dari sini. Pastikan nama session yang dibuat di sini sesuai dengan parameter "Session Name" di atas.
              </p>
            </div>
        </div>

        <div className="ds-card overflow-hidden h-[800px] w-full relative group">
          <iframe 
            src="/api/wwebjs/proxy" 
            className="w-full h-full border-none opacity-0 transition-opacity duration-300"
            onLoad={(e) => (e.target as HTMLIFrameElement).classList.remove('opacity-0')}
            title="WWebJS Services Proxy"
          />
          <div className="absolute inset-0 flex items-center justify-center -z-10 ds-icon-muted">
            <RefreshCw className="animate-spin w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
