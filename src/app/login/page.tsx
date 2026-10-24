'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginService } from '@/graphql/mutation/login';
import { registerService } from '@/graphql/mutation/register';
import { extractStoreRole, extractStoreId } from '@/lib/jwt';
import { setAuthToken } from '@/lib/auth';
import TermsModal from '@/components/TermsModal';
import { getPublicAppSettingsService } from '@/graphql/query/settings/getPublicAppSettings';
import { useEffect } from 'react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Terms & Conditions states
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');

  const router = useRouter();

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await getPublicAppSettingsService(['syarat_ketentuan']);
        const terms = res.getPublicAppSettings.find((s: any) => s.key === 'syarat_ketentuan');
        if (terms) setTermsContent(terms.value);
      } catch (err) {
        console.error('Failed to fetch terms:', err);
      }
    };
    fetchTerms();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const res = await loginService(email, password);
      const token = res.login.access_token;
      const role = res.login.user.role;

      if (role === "admin") {
        setAuthToken(token);
        router.push("/admin/dashboard");
        return;
      }

      setAuthToken(token);

      // Staff (single-store auto-claim) langsung ke chat outlet-nya.
      const earlyStoreRole = extractStoreRole(token);
      const earlyStoreId = extractStoreId(token);
      if (earlyStoreRole === 'staff' && earlyStoreId) {
        router.push(`/chat/${earlyStoreId}`);
        return;
      }

      // Owner: langsung masuk dashboard tunggal (SEMUA outlet), tanpa pilih merchant.
      router.push('/dashboard');
    } catch (err: any) {
      const validation = err?.extensions?.validation;
      if (validation) {
        setErrors(validation);
      } else {
        setErrors({ general: err.message || 'Login gagal. Periksa kembali email dan password anda.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage(null);

    if (!agreedTerms) {
      setErrors({ general: 'Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.' });
      setLoading(false);
      return;
    }

    if (!image) {
      setErrors({ general: 'Logo/Gambar Toko wajib diunggah.' });
      setLoading(false);
      return;
    }

    try {
      await registerService({
        username,
        full_name: fullName,
        email,
        phone,
        password,
        store_name: storeName,
        description,
        image
      });

      setSuccessMessage("register berhasil, silahkan tunggu administrator menvalidasi");
      setIsRegister(false);
      // Reset fields
      setUsername('');
      setFullName('');
      setPhone('');
      setStoreName('');
      setDescription('');
      setImage(null);
    } catch (err: any) {
      console.error('Register failed:', err);
      const validation = err?.extensions?.validation;
      if (validation) {
        setErrors(validation);
      } else {
        setErrors({ general: err.message || 'Registrasi gagal. Silahkan coba lagi.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-app min-h-screen flex text-slate-900 bg-white">
      {/* Left Column - Image/Illustration (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative flex-col justify-center items-center overflow-hidden border-r border-blue-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-200/50 via-blue-50 to-white -z-10"></div>
        <div className="z-10 p-12 text-center flex flex-col items-center">
          <h2 className="ds-display text-blue-800 mb-4">
            {isRegister ? 'Gabung omBot' : 'Selamat Datang Kembali'}
          </h2>
          <p className="text-base text-blue-600/80 mb-10 max-w-md">
            {isRegister ? 'Mulai kelola toko UMKM Anda dengan sistem order management terbaik.' : 'Kelola toko Anda dengan efisien dan lebih terstruktur dengan omBot.'}
          </p>
          <div className="relative w-full max-w-[650px] aspect-[4/3] rounded-2xl bg-white p-4 border border-white/40">
            <img src="/allphase.png" alt="omBot Illustration" className="w-full h-full object-contain rounded-xl bg-slate-50" />
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white overflow-y-auto">
        <div className="relative z-10 w-full max-w-md my-8 space-y-6 rounded-3xl bg-white/80 p-8 backdrop-blur-lg sm:bg-transparent sm:p-0">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}

          {errors.general && (
            <div className="ds-alert" data-tone="bad">
              <span className="font-semibold">{errors.general}</span>
            </div>
          )}

          {successMessage && (
            <div className="ds-alert" data-tone="ok">
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-center sm:justify-start mb-6 lg:hidden">
              <img src="/ombotico.png" alt="Logo" className="w-16 h-16 object-contain rounded-xl" />
            </div>
            <h1 className="ds-display text-slate-900">
              {isRegister ? 'Daftar Akun Baru' : 'Login ke omBot'}
            </h1>
            <p className="ds-hint">Order Management Untuk UMKM untuk Indonesia</p>
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">Username</label>
                    <input
                      type="text"
                      className="ds-input"
                      aria-invalid={errors.username ? 'true' : undefined}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    {errors.username && <p className="ds-error">{errors.username[0]}</p>}
                  </div>
                  <div>
                    <label className="ds-label">Nama Lengkap</label>
                    <input
                      type="text"
                      className="ds-input"
                      aria-invalid={errors.full_name ? 'true' : undefined}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    {errors.full_name && <p className="ds-error">{errors.full_name[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className="ds-label">Nomor HP</label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="08123..."
                    aria-invalid={errors.phone ? 'true' : undefined}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {errors.phone && <p className="ds-error">{errors.phone[0]}</p>}
                </div>

                <div>
                  <label className="ds-label">Nama Toko</label>
                  <input
                    type="text"
                    className="ds-input"
                    aria-invalid={errors.store_name ? 'true' : undefined}
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                  {errors.store_name && <p className="ds-error">{errors.store_name[0]}</p>}
                </div>

                <div>
                  <label className="ds-label">Deskripsi Toko</label>
                  <textarea
                    className="ds-textarea"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="ds-label">
                    Logo/Gambar Toko <span className="text-red-500">* (Wajib)</span>
                  </label>
                  <input
                    type="file"
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    accept="image/*"
                    required
                  />
                  {errors.image && <p className="ds-error">{errors.image[0]}</p>}
                </div>
              </>
            )}

            <div>
              <label className="ds-label">Alamat Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                className="ds-input"
                aria-invalid={errors.email ? 'true' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && (
                <p className="ds-error">{errors.email[0] || errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="ds-label mb-0">Password</label>                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="ds-input"
                aria-invalid={errors.password ? 'true' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && (
                <p className="ds-error">{errors.password[0] || errors.password}</p>
              )}
            </div>

            {isRegister && (
              /* Terms & Conditions Checkbox */
              <div className="flex items-start gap-3 py-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    className={`h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer ${
                      errors.general && !agreedTerms ? 'border-red-400 ring-2 ring-red-100' : ''
                    }`}
                    checked={agreedTerms}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowTermsModal(true);
                      } else {
                        setAgreedTerms(false);
                      }
                    }}
                  />
                </div>
                <div className="text-sm leading-5">
                  <label htmlFor="terms" className="text-slate-600 font-medium cursor-pointer">
                    Saya setuju dengan{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 font-bold hover:underline underline-offset-4"
                    >
                      Syarat & Ketentuan
                    </button>
                    {' '}layanan omBot.
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="ds-btn w-full h-11 mt-4"
              data-variant="primary"
              disabled={loading}
            >
              <span>{loading ? 'Memproses...' : (isRegister ? 'Daftar Sekarang' : 'Masuk Dashboard')}</span>
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setAgreedTerms(false);
                setErrors({});
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isRegister ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Daftar di sini'}
            </button>
          </div>
        </div>
      </div>

      {showTermsModal && (
        <TermsModal
          htmlContent={termsContent}
          onCancel={() => {
            setShowTermsModal(false);
          }}
          onApprove={() => {
            setAgreedTerms(true);
            setShowTermsModal(false);
          }}
        />
      )}
    </div>
  );
}
