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
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({}); 

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

      
      const validation = err?.extensions?.validation;

      if (validation) {
        setErrors({
          email: validation.email?.[0],
          password: validation.password?.[0],
        });
      } else {
        setErrors({
          general: 'Login gagal. Periksa kembali email dan password anda.',
        });
      }
      console.error('Login flow failed:', err);
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
    <div className="min-h-screen flex text-slate-900 bg-white">
      {/* Left Column - Image/Illustration (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative flex-col justify-center items-center overflow-hidden border-r border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-blue-50 to-white -z-10 pattern-dots pattern-blue-200 pattern-bg-transparent pattern-size-4 pattern-opacity-40"></div>
        <div className="z-10 p-12 text-center flex flex-col items-center">
            <h2 className="text-4xl font-extrabold text-blue-800 mb-6 drop-shadow-sm">Selamat Datang Kembali</h2>
            <p className="text-lg text-blue-600/80 mb-12 max-w-md">
              Kelola toko Anda dengan efisien dan lebih terstruktur dengan omBot.
            </p>
            {/* The colorful image placeholder */}
            <div className="relative w-full max-w-[650px] aspect-[4/3] rounded-2xl bg-white shadow-2xl p-4 transform transition-transform hover:scale-105 duration-500 border border-white/40 backdrop-blur-sm">
                <img src="/allphase.png" alt="omBot Illustration" className="w-full h-full object-contain rounded-xl bg-slate-50" />
            </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        {/* Background blobs for mobile */}
        <div className="lg:hidden absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="lg:hidden absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

        <div className="bg-white/80 backdrop-blur-lg sm:bg-transparent rounded-3xl shadow-xl sm:shadow-none p-8 sm:p-0 w-full max-w-md border border-slate-100 sm:border-transparent space-y-8 z-10 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-3xl sm:rounded-none flex items-center justify-center z-50">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}

          {errors.general && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm shadow-sm flex items-start">
              <span className="font-semibold block sm:inline">{errors.general}</span>
            </div>
          )}

          <div className="text-center sm:text-left space-y-2">
            <div className="flex justify-center sm:justify-start mb-6 lg:hidden">
                <img src="/omBot.png" alt="Logo" className="w-16 h-16 object-contain rounded-xl shadow-md" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Login ke omBot</h1>
            <p className="text-base text-slate-500 font-medium">Order Management Bot by Bramantyo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Alamat Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="nama@email.com"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.email ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="text-sm text-red-500 font-medium animate-pulse">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <p className="text-sm text-red-500 font-medium animate-pulse">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none mt-4"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
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
