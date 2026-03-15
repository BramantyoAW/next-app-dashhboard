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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">WhatsApp Configuration</h1>
          <p className="text-slate-500 mt-1">Integrasi wwebjs-services untuk pengiriman notifikasi via WhatsApp</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp_number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono"
                value={settings.whatsapp_number}
                onChange={handleChange}
                placeholder="6281234567890"
              />
              <p className="text-xs text-slate-500">Nomor pengirim default (format: 628...)</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Name</label>
              <input
                type="text"
                name="whatsapp_session"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono"
                value={settings.whatsapp_session}
                onChange={handleChange}
                placeholder="store1"
              />
              <p className="text-xs text-slate-500">Nama session yang terdaftar di wwebjs</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi WhatsApp'}
          </button>
        </form>
      </div>

      {/* WWebJS Proxy Iframe */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-500" />
            WWebJS Services Management
          </div>
        </h2>
        
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3">
            <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-950">Proxy ke Container wwebjs-services</p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Di bawah ini adalah tampilan langsung dari microservice wwebjs. Anda bisa scan QR, melihat log pesan, dan mereset session dari sini. Pastikan nama session yang dibuat di sini sesuai dengan parameter "Session Name" di atas.
              </p>
            </div>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner h-[800px] w-full relative group">
          <iframe 
            src="/api/wwebjs/" 
            className="w-full h-full border-none opacity-0 transition-opacity duration-300"
            onLoad={(e) => (e.target as HTMLIFrameElement).classList.remove('opacity-0')}
            title="WWebJS Services Proxy"
          />
          <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-400">
            <RefreshCw className="animate-spin w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
