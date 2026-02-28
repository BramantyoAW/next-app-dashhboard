'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginService } from '@/graphql/mutation/login';
import { registerService } from '@/graphql/mutation/register';
import { myStoresService } from '@/graphql/query/myStores';
import { chooseStoreService } from '@/graphql/mutation/chooseStore';
import StorePicker from '@/components/StorePicker';

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

  const [stores, setStores] = useState<{ id: number; name: string }[] | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();

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
        localStorage.setItem("token", token);
        router.push("/admin/dashboard");
        return;
      }

      const s = await myStoresService(token);

      if (!s.myStores || s.myStores.length === 0) {
        localStorage.setItem('token', token);
        router.push('/dashboard');
        return;
      }

      setLoginToken(token);
      setStores(s.myStores);
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

  const handlePickStore = async (storeId: number) => {
    if (!loginToken) return;
    setLoading(true);
    try {
      const chosen = await chooseStoreService(loginToken, storeId);
      localStorage.setItem('token', chosen.chooseStore.access_token);
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
            <h2 className="text-4xl font-extrabold text-blue-800 mb-6 drop-shadow-sm">
              {isRegister ? 'Gabung omBot' : 'Selamat Datang Kembali'}
            </h2>
            <p className="text-lg text-blue-600/80 mb-12 max-w-md">
              {isRegister ? 'Mulai kelola toko UMKM Anda dengan sistem order management terbaik.' : 'Kelola toko Anda dengan efisien dan lebih terstruktur dengan omBot.'}
            </p>
            <div className="relative w-full max-w-[650px] aspect-[4/3] rounded-2xl bg-white shadow-2xl p-4 transform transition-transform hover:scale-105 duration-500 border border-white/40 backdrop-blur-sm">
                <img src="/allphase.png" alt="omBot Illustration" className="w-full h-full object-contain rounded-xl bg-slate-50" />
            </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white overflow-y-auto">
        <div className="bg-white/80 backdrop-blur-lg sm:bg-transparent rounded-3xl shadow-xl sm:shadow-none p-8 sm:p-0 w-full max-w-md border border-slate-100 sm:border-transparent space-y-6 z-10 relative my-8">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-3xl sm:rounded-none flex items-center justify-center z-50">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}

          {errors.general && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm shadow-sm">
              <span className="font-semibold block">{errors.general}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 rounded-lg text-sm shadow-sm">
              <span className="font-semibold block">{successMessage}</span>
            </div>
          )}

          <div className="text-center sm:text-left space-y-2">
            <div className="flex justify-center sm:justify-start mb-6 lg:hidden">
                <img src="/omBot.png" alt="Logo" className="w-16 h-16 object-contain rounded-xl shadow-md" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isRegister ? 'Daftar Akun Baru' : 'Login ke omBot'}
            </h1>
            <p className="text-base text-slate-500 font-medium">Order Management Untuk UMKM untuk Indonesia</p>
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    {errors.username && <p className="text-xs text-red-500 font-medium">{errors.username[0]}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nomor HP</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="08123..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone[0]}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Toko</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi Toko</label>
                  <textarea
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Logo/Gambar Toko <span className="text-red-500">* (Wajib)</span></label>
                  <input
                    type="file"
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    accept="image/*"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Alamat Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.email ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium">{errors.email[0] || errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 focus:bg-white'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && (
                <p className="text-xs text-red-500 font-medium">{errors.password[0] || errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 mt-4 flex items-center justify-center space-x-2"
              disabled={loading}
            >
              <span>{loading ? 'Memproses...' : (isRegister ? 'Daftar Sekarang' : 'Masuk Dashboard')}</span>
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isRegister ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Daftar di sini'}
            </button>
          </div>
        </div>
      </div>

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
