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
          ? `mutation($i: LoginCustomerInput!) {
              loginCustomer(input: $i) { token customer { id name email } }
            }`
          : `mutation($i: RegisterCustomerInput!) {
              registerCustomer(input: $i) { token customer { id name email } }
            }`;
      const input =
        mode === 'login'
          ? { email, password }
          : { name, email, password, phone: phone || null, web_store_slug: hash };
      const data = await gqlFetch<{ loginCustomer?: { token: string }; registerCustomer?: { token: string } }>(
        query,
        { i: input },
      );
      const token = data.loginCustomer?.token ?? data.registerCustomer?.token;
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
    <main className="mx-auto max-w-sm p-6">
      <div className="mb-4 flex rounded-lg border bg-neutral-50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-md py-1.5 ${mode === 'login' ? 'bg-white shadow' : ''}`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-md py-1.5 ${mode === 'register' ? 'bg-white shadow' : ''}`}
        >
          Daftar
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <h1 className="text-xl font-semibold">
          {mode === 'login' ? 'Masuk' : 'Daftar Akun Baru'}
        </h1>

        {mode === 'register' && (
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {mode === 'register' && (
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="No. HP (opsional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}

        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {mode === 'register' && (
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Konfirmasi password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>

        <p className="text-center text-xs text-neutral-500">
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button type="button" onClick={() => setMode('register')} className="underline">
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button type="button" onClick={() => setMode('login')} className="underline">
                Masuk
              </button>
            </>
          )}
        </p>

        <p className="text-center text-xs">
          <Link href={`/storefront/${hash}`} className="text-neutral-500 hover:underline">
            ← Kembali ke toko
          </Link>
        </p>
      </form>
    </main>
  );
}
