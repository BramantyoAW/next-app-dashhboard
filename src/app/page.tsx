import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap, Shield, TrendingUp, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 overflow-x-hidden">

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <Image
                src="/ombotico.png"
                alt="omBot Logo"
                width={52}
                height={52}
                className="relative rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">omBot</span>
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5 opacity-80">Order Management Bot</span>
            </div>
          </div>
          <nav className="flex items-center gap-2 md:gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-2">
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:pointer-events-none disabled:opacity-50"
            >
              Mulai
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden bg-white">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white -z-10"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl -z-10"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-30 blur-3xl -z-10"></div>

          <div className="container px-4 md:px-6 mx-auto max-w-7xl">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-6 max-w-4xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Solusi Manajemen Toko Modern
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-slate-900 leading-tight animate-fade-up">
                  Kelola Bisnis Anda <br className="hidden sm:block" />
                  Lebih <span className="text-gradient-brand">Terstruktur</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-base text-slate-600 md:text-lg lg:text-xl leading-relaxed animate-fade-up animation-delay-100">
                  omBot membantu Anda memantau seluruh toko, mengelola operasional, dan menerima laporan otomatis — semuanya dalam satu platform.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 animate-fade-up animation-delay-200">
                <Link
                  href="/login"
                  className="inline-flex h-12 md:h-14 items-center justify-center rounded-full bg-gradient-brand px-8 md:px-10 py-3 text-base md:text-lg font-bold text-white shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 group"
                >
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex h-12 md:h-14 items-center justify-center rounded-full bg-white border border-slate-200 px-8 md:px-10 py-3 text-base md:text-lg font-bold text-slate-700 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 hover:border-slate-300"
                >
                  Pelajari Lebih Lanjut
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 pt-4 animate-fade-up animation-delay-300">
                {[
                  { value: "10K+", label: "Toko Terdaftar" },
                  { value: "50K+", label: "Pesanan/Hari" },
                  { value: "99.9%", label: "Uptime" },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl md:text-3xl font-black text-slate-900">{value}</div>
                    <div className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Mockup */}
            <div className="mx-auto mt-14 md:mt-20 max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-float overflow-hidden p-2 md:p-4 rotate-[0.5deg] hover:rotate-0 transition-transform duration-500">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border bg-slate-50 bg-dot-pattern flex items-center justify-center">
                <Image
                  src="/allphase.png"
                  alt="omBot Concept"
                  width={1200}
                  height={675}
                  className="object-contain w-full h-full max-h-[600px] drop-shadow-2xl z-10 p-2 md:p-4"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-16 md:py-28 bg-slate-50 relative">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center space-y-3 text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Dirancang untuk Pertumbuhan Bisnis Anda
              </h2>
              <p className="max-w-[600px] text-base md:text-lg text-slate-500">
                Fitur lengkap yang membantu Anda mengelola toko dari awal hingga scaling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Feature cards */}
              {[
                {
                  icon: <Zap size={22} className="text-amber-500" />,
                  title: "Quick Setup",
                  desc: "Mulai dalam hitungan menit. Tidak perlu keahlian teknis.",
                  color: "bg-amber-50",
                },
                {
                  icon: <Clock size={22} className="text-blue-500" />,
                  title: "Auto Processing",
                  desc: "Pesanan diproses otomatis via WhatsApp tanpa campur tangan manual.",
                  color: "bg-blue-50",
                },
                {
                  icon: <TrendingUp size={22} className="text-green-500" />,
                  title: "Real-time Reports",
                  desc: "Laporan penjualan dan inventori diperbarui secara langsung.",
                  color: "bg-green-50",
                },
                {
                  icon: <Shield size={22} className="text-indigo-500" />,
                  title: "Secure & Reliable",
                  desc: "Data toko Anda disimpan dengan enkripsi dan backup otomatis.",
                  color: "bg-indigo-50",
                },
              ].map(({ icon, title, desc, color }) => (
                <div key={title} className="group relative bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    {icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Phase 1 */}
        <section className="w-full py-16 md:py-24 bg-white relative">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Phase 1
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Quick Setup — Mulai Dalam Hitungan Menit
                </h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                  Daftarkan toko Anda, atur produk, dan mulai menerima pesanan. Tidak perlu konfigurasi rumit atau keahlian teknis.
                </p>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  Mulai Gratis
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 shadow-card-hover overflow-hidden">
                <img
                  src="/phase1.png"
                  alt="Phase 1 Setup"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Phase 2 */}
        <section className="w-full py-16 md:py-24 bg-slate-50">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-2 lg:order-1 rounded-2xl border border-slate-100 bg-white shadow-card-hover overflow-hidden">
                <img
                  src="/phase2.png"
                  alt="Phase 2 Workflow"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Phase 2
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Daily Operations — Otomatis, Cepat, Akurat
                </h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                  Input pesanan via WhatsApp dan biarkan omBot memproses semuanya secara otomatis — dari konfirmasi hingga laporan harian.
                </p>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  Coba Sekarang
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 3 */}
        <section className="w-full py-16 md:py-24 bg-white">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Phase 3
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Reports & Scalability — Raih Pertumbuhan Lebih Jauh
                </h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                  Dapatkan laporan mendalam, analisis performa, dan siap scale-up bisnis Anda ke level berikutnya.
                </p>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-green-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 group"
                >
                  Mulai Gunakan Sekarang
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 shadow-card-hover overflow-hidden">
                <img
                  src="/phase3.png"
                  alt="Phase 3 Scalability"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-brand relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,_white,transparent_60%)]"></div>
          </div>
          <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center relative z-10">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Siap Memulai?
            </h2>
            <p className="text-base md:text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Bergabung bersama ribuan pelaku usaha yang sudah mengelola bisnisnya dengan omBot.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex h-12 md:h-14 items-center justify-center rounded-full bg-white px-10 py-3 text-base md:text-lg font-bold text-blue-600 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 group"
              >
                Mulai Sekarang
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t bg-white py-8 md:py-10">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-center md:text-left">
          <div className="flex items-center gap-3">
            <Image src="/ombotico.png" alt="omBot" width={32} height={32} className="rounded-lg opacity-60" />
            <span className="text-xl font-bold text-slate-400">omBot</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} omBot Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}