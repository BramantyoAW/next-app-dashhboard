'use client';
import Link from 'next/link';
import { useState } from 'react';
import { gqlFetch } from '@/lib/graphqlClient';
import { setCustomerToken } from '@/lib/customer-token';

type Mode = 'login' | 'register';

export function SignInForm({ hash, nextPath }: { hash: string; nextPath: string }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (mode === 'register' && password !== confirm) {
      setErr('Konfirmasi password tidak cocok');
      return;
    }
    setBusy(true);
    try {
      const query =
        mode === 'login'
          ? `mutation($i: CustomerLoginInput!) {
              customerLogin(input: $i) { token customer { id name email } }
            }`
          : `mutation($i: CustomerRegisterInput!) {
              customerRegister(input: $i) { token customer { id name email } }
            }`;
      const input =
        mode === 'login'
          ? { email, password }
          : { name, email, password, phone: phone || null, web_store_slug: hash };
      const data = await gqlFetch<{ customerLogin?: { token: string }; customerRegister?: { token: string } }>(
        query,
        { i: input },
      );
      const token = data.customerLogin?.token ?? data.customerRegister?.token;
      if (!token) throw new Error('Token kosong dari server');
      setCustomerToken(token);
      window.location.href = nextPath || `/storefront/${hash}`;
    } catch (e: any) {
      setErr(e?.message ?? 'Gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8">
      <div className="mb-5 flex rounded-full border border-slate-200 bg-slate-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-full py-2 font-semibold transition ${
            mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-full py-2 font-semibold transition ${
            mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
          }`}
        >
          Daftar
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          {mode === 'login' ? 'Masuk' : 'Daftar Akun Baru'}
        </h1>

        {mode === 'register' && (
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {mode === 'register' && (
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
            placeholder="No. HP (opsional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}

        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {mode === 'register' && (
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ ['--tw-ring-color' as never]: 'var(--brand)' }}
            placeholder="Konfirmasi password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        )}

        {err && <p className="text-sm font-medium text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition hover:opacity-90"
          style={{ background: 'var(--brand, #111)' }}
        >
          {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>

        <p className="text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button type="button" onClick={() => setMode('register')} className="font-bold underline">
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button type="button" onClick={() => setMode('login')} className="font-bold underline">
                Masuk
              </button>
            </>
          )}
        </p>

        <p className="text-center text-xs">
          <Link href={`/storefront/${hash}`} className="text-slate-500 hover:underline">
            ← Kembali ke toko
          </Link>
        </p>
      </form>
    </main>
  );
}
