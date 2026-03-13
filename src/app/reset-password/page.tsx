'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordService } from '@/graphql/mutation/forgotPassword';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!token || !email) {
      setError('Tautan reset password tidak valid. Pastikan Anda mengklik tautan dari email.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      const res = await resetPasswordService(token, email, password, passwordConfirmation);
      setSuccessMessage(res.message || 'Password berhasil direset. Silakan login dengan password baru.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal mereset password. Tautan mungkin kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg sm:bg-transparent rounded-3xl p-8 sm:p-0 w-full max-w-md border border-slate-100 sm:border-transparent space-y-6 z-10 relative">
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm shadow-sm">
          <span className="font-semibold block">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 rounded-lg text-sm shadow-sm">
          <span className="font-semibold block">{successMessage}</span>
        </div>
      )}

      <div className="text-center sm:text-left space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-base text-slate-500 font-medium">Buat password baru untuk akun Anda.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password Baru</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              error ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
            }`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!token || !email}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Konfirmasi Password Baru</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              error ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
            }`}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            disabled={!token || !email}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 mt-4 flex items-center justify-center space-x-2"
          disabled={loading || !token || !email}
        >
          <span>{loading ? 'Memproses...' : 'Simpan Password Baru'}</span>
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Batal dan kembali ke Login
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex text-slate-900 bg-white">
      {/* Left Column (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative flex-col justify-center items-center overflow-hidden border-r border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-blue-50 to-white -z-10 pattern-dots pattern-blue-200 pattern-bg-transparent pattern-size-4 pattern-opacity-40"></div>
        <div className="z-10 p-12 text-center flex flex-col items-center">
            <h2 className="text-4xl font-extrabold text-blue-800 mb-6 drop-shadow-sm">
              Buat Password Baru
            </h2>
            <p className="text-lg text-blue-600/80 mb-12 max-w-md">
              Pastikan gunakan password yang kuat dan mudah diingat.
            </p>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <Suspense fallback={<div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

