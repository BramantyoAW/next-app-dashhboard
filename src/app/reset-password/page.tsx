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

  const invalid = !token || !email;

  return (
    <div className="relative z-10 w-full max-w-md space-y-6 rounded-3xl bg-white/80 p-8 backdrop-blur-lg sm:bg-transparent sm:p-0">

      {error && (
        <div className="ds-alert" data-tone="bad">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="ds-alert" data-tone="ok">
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <h1 className="ds-display text-slate-900">
          Reset Password
        </h1>
        <p className="ds-hint">Buat password baru untuk akun Anda.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="ds-label">Password Baru</label>
          <input
            type="password"
            placeholder="••••••••"
            className="ds-input"
            aria-invalid={error ? 'true' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={invalid}
          />
        </div>

        <div>
          <label className="ds-label">Konfirmasi Password Baru</label>
          <input
            type="password"
            placeholder="••••••••"
            className="ds-input"
            aria-invalid={error ? 'true' : undefined}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            disabled={invalid}
          />
        </div>

        <button
          type="submit"
          className="ds-btn w-full h-11 mt-4"
          data-variant="primary"
          disabled={loading || invalid}
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
    <div className="ds-app min-h-screen flex text-slate-900 bg-white">
      {/* Left Column (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative flex-col justify-center items-center overflow-hidden border-r border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-blue-50 to-white -z-10"></div>
        <div className="z-10 p-12 text-center flex flex-col items-center">
          <h2 className="ds-display text-blue-800 mb-4">
            Buat Password Baru
          </h2>
          <p className="text-base text-blue-600/80 mb-10 max-w-md">
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
