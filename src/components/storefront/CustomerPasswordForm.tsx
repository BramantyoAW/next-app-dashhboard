'use client';

import { useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';

export function CustomerPasswordForm() {
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const token = localStorage.getItem('customer_token') || '';
      await gqlFetch(`mutation($i: ChangeCustomerPasswordInput!) { changeCustomerPassword(input: $i) { id } }`, { i: form }, token);
      setMessage('Password berhasil diubah.'); setForm({ current_password: '', new_password: '', new_password_confirmation: '' }); setEditing(false);
    } catch (e: any) { setError(e?.message || 'Gagal mengubah password.'); } finally { setBusy(false); }
  }
  return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Keamanan Akun</h2>{!editing && <button type="button" onClick={() => setEditing(true)} className="text-sm font-bold text-blue-600 hover:underline">Ubah Password</button>}</div>{editing ? <form onSubmit={save} className="mt-4 space-y-4">{([['current_password', 'Password Lama'], ['new_password', 'Password Baru'], ['new_password_confirmation', 'Konfirmasi Password Baru']] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold text-slate-700">{label}<input required type="password" minLength={key === 'current_password' ? 1 : 8} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>)}{error && <p className="text-sm text-rose-600">{error}</p>}<div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan Password'}</button><button type="button" onClick={() => { setEditing(false); setError(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Batal</button></div></form> : <p className="mt-2 text-sm text-slate-500">Password minimal 8 karakter. Gunakan kombinasi huruf dan angka.</p>}{message && <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>}</section>;
}
