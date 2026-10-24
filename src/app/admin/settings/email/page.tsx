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
        <div
          className="animate-spin h-8 w-8 border-4 rounded-full"
          style={{ borderColor: 'var(--ds-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">SMTP & Notifications</h1>
          <p className="ds-hint">Konfigurasi server email dan template notifikasi otomatis</p>
        </div>
        <div
          className="flex gap-1 p-1"
          style={{ background: 'var(--ds-surface-2)', borderRadius: 'var(--ds-radius)' }}
        >
          <button 
            onClick={() => setActiveTab('smtp')}
            className="ds-btn"
            data-variant={activeTab === 'smtp' ? 'secondary' : 'ghost'}
          >
            SMTP Config
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className="ds-btn"
            data-variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          >
            Email Templates
          </button>
        </div>
      </div>

      <div className="ds-card overflow-hidden">
        <form onSubmit={handleSave}>
          {activeTab === 'smtp' ? (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="ds-label">SMTP Host</label>
                  <input
                    type="text"
                    name="mail_host"
                    placeholder="smtp.gmail.com"
                    className="ds-input"
                    value={settings.mail_host}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label">SMTP Port</label>
                  <input
                    type="text"
                    name="mail_port"
                    placeholder="587"
                    className="ds-input"
                    value={settings.mail_port}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="ds-label">Username</label>
                  <input
                    type="text"
                    name="mail_username"
                    placeholder="emailanda@gmail.com"
                    className="ds-input"
                    value={settings.mail_username}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label">Password</label>
                  <input
                    type="password"
                    name="mail_password"
                    className="ds-input"
                    value={settings.mail_password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="ds-label">Encryption</label>
                  <select
                    name="mail_encryption"
                    className="ds-select"
                    value={settings.mail_encryption}
                    onChange={handleChange}
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label">From Address</label>
                  <input
                    type="email"
                    name="mail_from_address"
                    className="ds-input"
                    value={settings.mail_from_address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">From Name</label>
                <input
                  type="text"
                  name="mail_from_name"
                  placeholder="omBot Notification"
                  className="ds-input"
                  value={settings.mail_from_name}
                  onChange={handleChange}
                />
              </div>

              {testResult && (
                <div className="ds-alert" data-tone={testResult.status ? 'ok' : 'bad'}>
                  {testResult.status ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                  <p>{testResult.message}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || saving}
                  className="ds-btn flex-1"
                  data-variant="secondary"
                >
                  {testing ? (
                    <div
                      className="animate-spin h-5 w-5 border-2 rounded-full"
                      style={{ borderColor: 'var(--ds-border-strong)', borderTopColor: 'var(--ds-fg-muted)' }}
                    />
                  ) : <ShieldCheck className="w-5 h-5" />}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={saving || testing}
                  className="ds-btn flex-[2]"
                  data-variant="primary"
                >
                  {saving ? (
                    <div
                      className="animate-spin h-5 w-5 border-2 rounded-full"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                    />
                  ) : <CheckCircle2 className="w-5 h-5" />}
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              <div className="ds-well flex gap-3" data-tone="accent">
                <Info className="w-5 h-5 ds-accent-text shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="ds-h2">Panduan Placeholder</p>
                  <p className="ds-caption">Gunakan variabel berikut untuk mengisi data secara otomatis: <code className="ds-mono">{'{{owner_name}}'}</code>, <code className="ds-mono">{'{{merchant_name}}'}</code>, <code className="ds-mono">{'{{date}}'}</code>, <code className="ds-mono">{'{{login_url}}'}</code></p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 ds-icon-muted" />
                    <label className="ds-label">1. Pendaftaran Akun (Pending Approval)</label>
                  </div>
                  <p className="ds-caption">Dikirim saat user berhasil mendaftar dan menunggu verifikasi admin.</p>
                  <textarea
                    name="email_template_registration_pending"
                    className="ds-textarea ds-mono"
                    style={{ minHeight: 128 }}
                    value={settings.email_template_registration_pending}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 ds-icon-muted" />
                    <label className="ds-label">2. Akun Disetujui (Approved)</label>
                  </div>
                  <p className="ds-caption">Dikirim saat administrator mengubah status user menjadi Aktif.</p>
                  <textarea
                    name="email_template_registration_approved"
                    className="ds-textarea ds-mono"
                    style={{ minHeight: 128 }}
                    value={settings.email_template_registration_approved}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 ds-icon-muted" />
                    <label className="ds-label">3. Akun Ditangguhkan (Suspended/Blocked)</label>
                  </div>
                  <p className="ds-caption">Dikirim saat administrator menangguhkan akses user.</p>
                  <textarea
                    name="email_template_account_suspended"
                    className="ds-textarea ds-mono"
                    style={{ minHeight: 128 }}
                    value={settings.email_template_account_suspended}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 ds-icon-muted" />
                    <label className="ds-label">4. Laporan Berkala (Harian/Mingguan/Bulanan)</label>
                  </div>
                  <p className="ds-caption">Struktur dasar untuk pengiriman laporan otomatis ke email merchant.</p>
                  <textarea
                    name="email_template_report_general"
                    className="ds-textarea ds-mono"
                    style={{ minHeight: 128 }}
                    value={settings.email_template_report_general}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="ds-divider-top">
                <button
                  type="submit"
                  disabled={saving}
                  className="ds-btn w-full"
                  data-variant="primary"
                >
                  {saving ? (
                    <div
                      className="animate-spin h-5 w-5 border-2 rounded-full"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                    />
                  ) : <CheckCircle2 className="w-5 h-5" />}
                  {saving ? 'Menyimpan...' : 'Simpan Semua Template'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {activeTab === 'smtp' && (
        <div className="ds-card overflow-hidden">
          <div
            className="p-4 flex items-center gap-2"
            style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}
          >
              <HelpCircle className="w-5 h-5 ds-accent-text" />
              <h2 className="ds-h2">Petunjuk Konfigurasi SMTP</h2>
          </div>
          <div className="p-8 space-y-6">
              <section className="space-y-3">
                  <div className="flex items-center gap-2">
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Gmail" />
                      <h3 className="ds-h2">Gmail / Google Workspace</h3>
                  </div>
                  <ul className="ds-small space-y-2 list-disc pl-5">
                      <li>Host: <code className="ds-mono">smtp.gmail.com</code></li>
                      <li>Port: <code className="ds-mono">587</code> (Encryption: <code className="ds-mono">TLS</code>)</li>
                      <li><strong>Penting:</strong> Gunakan <strong>App Password</strong>, bukan password akun utama.</li>
                      <li>Aktifkan 2FA → Akun Google → Keamanan → App Passwords.</li>
                  </ul>
              </section>

              <section className="space-y-3">
                  <div className="flex items-center gap-2">
                      <img src="https://www.microsoft.com/favicon.ico" className="w-4 h-4" alt="Outlook" />
                      <h3 className="ds-h2">Outlook / Office 365</h3>
                  </div>
                  <ul className="ds-small space-y-2 list-disc pl-5">
                      <li>Host: <code className="ds-mono">smtp.office365.com</code></li>
                      <li>Port: <code className="ds-mono">587</code> (Encryption: <code className="ds-mono">TLS</code>)</li>
                  </ul>
              </section>

              <div className="ds-well flex gap-3">
                  <Info className="w-5 h-5 ds-icon-muted shrink-0 mt-0.5" />
                  <p className="ds-caption leading-relaxed italic">
                      Jika menggunakan provider lain, hubungi penyedia layanan Anda untuk detail SMTP Host dan Port.
                  </p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
