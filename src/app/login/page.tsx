'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginService } from '@/graphql/mutation/login';
import { myStoresService } from '@/graphql/query/myStores';
import { chooseStoreService } from '@/graphql/mutation/chooseStore';
import StorePicker from '@/components/StorePicker';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stores, setStores] = useState<{ id: number; name: string }[] | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Login → dapat token awal (mungkin tanpa store_id)
      const res = await loginService(email, password);
      const token = res.login.access_token;
      const role = res.login.user.role;

      if (role === "admin") {
        // admin langsung masuk dashboard admin (tanpa pilih store)
        localStorage.setItem("token", token);
        router.push("/admin/dashboard");
        return;
      }

      // 2) Ambil daftar store user
      const s = await myStoresService(token);

      if (!s.myStores || s.myStores.length === 0) {
        // Tidak punya store → langsung pakai token login
        localStorage.setItem('token', token);
        router.push('/dashboard');
        return;
      }

      // 3) Punya ≥1 store → SELALU tampilkan picker (tidak auto-choose)
      setLoginToken(token);
      setStores(s.myStores);
      // jangan redirect di sini
    } catch (err: any) {
      console.error('Login flow failed:', err);
      alert(err?.message || 'Login gagal. Cek kembali email & password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickStore = async (storeId: number) => {
    if (!loginToken) return;
    setLoading(true);
    try {
      const chosen = await chooseStoreService(loginToken, storeId);
      localStorage.setItem('token', chosen.chooseStore.access_token); // token dengan claim store_id
      setStores(null);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('chooseStore failed:', err);
      alert(err?.message || 'Gagal memilih store.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Logo */}
        <div className="text-center">
          <img src="/omBot.png" alt="Logo" className="mx-auto w-20 h-20 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Login to OmBot</h1>
          <p className="text-sm text-gray-500">Order Management Bot by Bramantyo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Login'}
          </button>
        </form>
      </div>

      {/* Modal pilih store */}
      {stores && (
        <StorePicker
          stores={stores}
          onPick={handlePickStore}
          onCancel={() => setStores(null)}
        />
      )}
    </div>
  );
}
