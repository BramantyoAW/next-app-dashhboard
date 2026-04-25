'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { ShieldCheck, CheckCircle2, XCircle, Info, FileCode } from 'lucide-react';

export default function TermsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [termsHtml, setTermsHtml] = useState('');

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await adminGetAppSettingsService(token);
      const fetchedSettings = res.appSettings;
      
      const termsSetting = fetchedSettings.find((item: any) => item.key === 'syarat_ketentuan');
      if (termsSetting) {
        setTermsHtml(termsSetting.value);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Gagal memuat pengaturan.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const input = [{
        key: 'syarat_ketentuan',
        value: termsHtml,
        type: 'string',
      }];

      await adminUpsertAppSettingsService(token, input);
      setStatus({ type: 'success', message: 'Syarat & Ketentuan berhasil disimpan!' });
      
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            Syarat & Ketentuan
          </h1>
          <p className="text-slate-500 mt-1 ml-11">Konfigurasi teks Syarat & Ketentuan yang akan muncul pada formulir pendaftaran.</p>
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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Anda dapat menggunakan tag HTML standar untuk memformat tampilan Syarat & Ketentuan (seperti <code>&lt;h1&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>, dll). Gunakan preview di bawah untuk melihat hasilnya.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileCode size={14} />
                  Konten HTML
                </label>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono uppercase tracking-tighter">Required Field</span>
              </div>
              <textarea
                name="syarat_ketentuan"
                rows={20}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 focus:bg-white transition-all font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
                value={termsHtml}
                onChange={(e) => setTermsHtml(e.target.value)}
                placeholder="Masukkan kode HTML Syarat & Ketentuan di sini..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
                {saving ? 'Sedang Menyimpan...' : 'Simpan Syarat & Ketentuan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
