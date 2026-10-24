'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPasswordService } from '@/graphql/mutation/forgotPassword';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await forgotPasswordService(email);
      setSuccessMessage(res.message || 'Tautan reset password telah dikirim ke email Anda.');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email reset password. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-app min-h-screen flex text-slate-900 bg-white">
      {/* Left Column (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative flex-col justify-center items-center overflow-hidden border-r border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-blue-50 to-white -z-10"></div>
        <div className="z-10 p-12 text-center flex flex-col items-center">
          <h2 className="ds-display text-blue-800 mb-4">
            Lupa Password?
          </h2>
          <p className="text-base text-blue-600/80 mb-10 max-w-md">
            Jangan khawatir. Masukkan email Anda dan kami akan mengirimkan tautan untuk mengatur ulang password Anda.
          </p>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="relative z-10 w-full max-w-md space-y-6 rounded-[var(--ds-radius)] bg-white/80 p-8 backdrop-blur-lg sm:bg-transparent sm:p-0">

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
            <p className="ds-hint">Masukkan email yang terdaftar pada akun Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ds-label">Alamat Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                className="ds-input"
                aria-invalid={error ? 'true' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="ds-btn w-full h-11 mt-4"
              data-variant="primary"
              disabled={loading}
            >
              <span>{loading ? 'Mengirim...' : 'Kirim Tautan Reset'}</span>
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
