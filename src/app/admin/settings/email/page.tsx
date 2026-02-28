'use client';

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetAppSettingsService } from '@/graphql/query/settings/getAppSettings';
import { adminUpsertAppSettingsService } from '@/graphql/mutation/settings/upsertAppSettings';
import { adminTestSmtpConnectionService } from '@/graphql/mutation/settings/testSmtpConnection';
import { DEFAULT_TEMPLATES, DEFAULT_EMAIL_WRAPPER } from '@/utils/emailTemplates';
import { Mail, ShieldCheck, HelpCircle, CheckCircle2, XCircle, Info, ExternalLink, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function SmtpSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'smtp' | 'templates'>('smtp');
  
  const [settings, setSettings] = useState({
    mail_host: '',
    mail_port: '',
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
    mail_from_address: '',
    mail_from_name: 'omBot Notification',
    email_template_registration_pending: '',
    email_template_registration_approved: '',
    email_template_report_general: '',
    email_template_account_suspended: '',
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
      // Set defaults first
      Object.keys(DEFAULT_TEMPLATES).forEach((key) => {
        (newSettings as any)[key] = (DEFAULT_TEMPLATES as any)[key].trim();
      });

      fetchedSettings.forEach((item: any) => {
        if (Object.keys(newSettings).includes(item.key)) {
          (newSettings as any)[item.key] = item.value;
        }
      });
      setSettings(newSettings);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Failed to load settings.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const input = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        type: 'string',
      }));

      await adminUpsertAppSettingsService(token, input);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await adminTestSmtpConnectionService(token, {
        host: settings.mail_host,
        port: parseInt(settings.mail_port),
        username: settings.mail_username,
        password: settings.mail_password,
        encryption: settings.mail_encryption,
        from_address: settings.mail_from_address,
        from_name: settings.mail_from_name,
      });

      setTestResult(res.testSmtpConnection);
    } catch (err: any) {
      console.error(err);
      setTestResult({
        status: false,
        message: err.message || 'Gagal terhubung ke server SMTP.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">SMTP & Notifications</h1>
          <p className="text-slate-500 mt-1">Konfigurasi server email dan template notifikasi otomatis</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'smtp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            SMTP Config
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Email Templates
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSave}>
          {activeTab === 'smtp' ? (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMTP Host</label>
                  <input
                    type="text"
                    name="mail_host"
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                    value={settings.mail_host}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMTP Port</label>
                  <input
                    type="text"
                    name="mail_port"
                    placeholder="587"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                    value={settings.mail_port}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    name="mail_username"
                    placeholder="emailanda@gmail.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                    value={settings.mail_username}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    name="mail_password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                    value={settings.mail_password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Encryption</label>
                  <select
                    name="mail_encryption"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all appearance-none"
                    value={settings.mail_encryption}
                    onChange={handleChange}
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">From Address</label>
                  <input
                    type="email"
                    name="mail_from_address"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                    value={settings.mail_from_address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">From Name</label>
                <input
                  type="text"
                  name="mail_from_name"
                  placeholder="omBot Notification"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                  value={settings.mail_from_name}
                  onChange={handleChange}
                />
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${testResult.status ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  {testResult.status ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                  <p className="text-sm font-semibold">{testResult.message}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || saving}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl border border-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {testing ? <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full" /> : <ShieldCheck className="w-5 h-5" />}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={saving || testing}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-blue-950">Panduan Placeholder</p>
                  <p className="text-xs text-blue-800 leading-relaxed">Gunakan variabel berikut untuk mengisi data secara otomatis: <code className="bg-white/50 px-1 rounded">{"{{owner_name}}"}</code>, <code className="bg-white/50 px-1 rounded">{"{{merchant_name}}"}</code>, <code className="bg-white/50 px-1 rounded">{"{{date}}"}</code>, <code className="bg-white/50 px-1 rounded">{"{{login_url}}"}</code></p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <label className="text-sm font-bold text-slate-700">1. Pendaftaran Akun (Pending Approval)</label>
                  </div>
                  <p className="text-xs text-slate-500">Dikirim saat user berhasil mendaftar dan menunggu verifikasi admin.</p>
                  <textarea
                    name="email_template_registration_pending"
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono text-xs"
                    value={settings.email_template_registration_pending}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <label className="text-sm font-bold text-slate-700">2. Akun Disetujui (Approved)</label>
                  </div>
                  <p className="text-xs text-slate-500">Dikirim saat administrator mengubah status user menjadi Aktif.</p>
                  <textarea
                    name="email_template_registration_approved"
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono text-xs"
                    value={settings.email_template_registration_approved}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <label className="text-sm font-bold text-slate-700">3. Akun Ditangguhkan (Suspended/Blocked)</label>
                  </div>
                  <p className="text-xs text-slate-500">Dikirim saat administrator menangguhkan akses user.</p>
                  <textarea
                    name="email_template_account_suspended"
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono text-xs"
                    value={settings.email_template_account_suspended}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <label className="text-sm font-bold text-slate-700">4. Laporan Berkala (Harian/Mingguan/Bulanan)</label>
                  </div>
                  <p className="text-xs text-slate-500">Struktur dasar untuk pengiriman laporan otomatis ke email merchant.</p>
                  <textarea
                    name="email_template_report_general"
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-mono text-xs"
                    value={settings.email_template_report_general}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 className="w-5 h-5" />}
                  {saving ? 'Menyimpan...' : 'Simpan Semua Template'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {activeTab === 'smtp' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900">Petunjuk Konfigurasi SMTP</h2>
          </div>
          <div className="p-8 space-y-6">
              <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Gmail" />
                      <h3>Gmail / Google Workspace</h3>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
                      <li>Host: <code className="bg-slate-100 px-1 rounded">smtp.gmail.com</code></li>
                      <li>Port: <code className="bg-slate-100 px-1 rounded">587</code> (Encryption: <code className="bg-slate-100 px-1 rounded">TLS</code>)</li>
                      <li><strong>Penting:</strong> Gunakan <strong>App Password</strong>, bukan password akun utama.</li>
                      <li>Aktifkan 2FA → Akun Google → Keamanan → App Passwords.</li>
                  </ul>
              </section>

              <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <img src="https://www.microsoft.com/favicon.ico" className="w-4 h-4" alt="Outlook" />
                      <h3>Outlook / Office 365</h3>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
                      <li>Host: <code className="bg-slate-100 px-1 rounded">smtp.office365.com</code></li>
                      <li>Port: <code className="bg-slate-100 px-1 rounded">587</code> (Encryption: <code className="bg-slate-100 px-1 rounded">TLS</code>)</li>
                  </ul>
              </section>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex gap-3">
                  <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                      Jika menggunakan provider lain, hubungi penyedia layanan Anda untuk detail SMTP Host dan Port.
                  </p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
