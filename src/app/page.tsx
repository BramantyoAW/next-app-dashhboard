import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart2, LayoutDashboard, Store, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
            <Image src="/omBot.png" alt="omBot Logo" width={36} height={36} className="rounded-lg shadow-sm" />
            <span className="text-2xl font-extrabold text-blue-700 tracking-tight">omBot</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:pointer-events-none disabled:opacity-50"
            >
              Mulai
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-24 lg:py-32 xl:py-48 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white -z-10"></div>
          <div className="container px-4 md:px-6 mx-auto max-w-7xl">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-6 max-w-4xl">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-slate-900">
                  Kelola Bisnis Anda <br className="hidden sm:block" />
                  Lebih <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Terstruktur</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-lg text-slate-600 md:text-xl lg:text-2xl leading-relaxed">
                  omBot membantu Anda memantau seluruh toko, mengelola operasional, dan menerima laporan otomatis.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/login"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-10 py-3 text-lg font-bold text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1"
                >
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
            
            <div className="mx-auto mt-20 max-w-7xl rounded-2xl border bg-white shadow-2xl overflow-hidden p-2 md:p-4 rotate-1 hover:rotate-0 transition-transform duration-500 ring-1 ring-slate-100">
               <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border bg-slate-50 flex items-center justify-center pattern-dots pattern-slate-200 pattern-bg-white pattern-size-4 pattern-opacity-20">
                  <Image 
                    src="/allphase.png" 
                    alt="omBot Concept" 
                    width={1200} 
                    height={675} 
                    className="object-contain w-full h-full max-h-[800px] drop-shadow-2xl z-10 p-2 md:p-4" 
                  />
               </div>
            </div>
          </div>
        </section>

        {/* Feature 1: Quick Setup */}
        <section className="w-full py-20 md:py-32 bg-slate-50 relative">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-slate-900">
                Phase 1: Quick Setup
              </h2>
              <p className="max-w-[700px] text-lg text-slate-500 md:text-xl">
                Langkah instan untuk mengawali perjalanan digitalisasi toko Anda.
              </p>
            </div>
            
            <div className="mx-auto max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-white bg-white hover:shadow-blue-200/50 transition-shadow duration-500">
               <img 
                 src="/phase1.png" 
                 alt="Phase 1 Setup" 
                 className="w-full h-auto object-cover"
               />
            </div>
          </div>
        </section>

        {/* Feature 2: Daily Operations */}
        <section className="w-full py-20 md:py-32 bg-blue-50/50">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-blue-700">
                Phase 2: Daily Operations
              </h2>
              <p className="max-w-[700px] text-lg text-slate-500 md:text-xl">
                Input pesanan via WhatsApp dan biarkan omBot memproses semuanya secara otomatis.
              </p>
            </div>
            
            <div className="mx-auto max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-white bg-white hover:shadow-blue-200/50 transition-shadow duration-500">
               <img 
                 src="/phase2.png" 
                 alt="Phase 2 Workflow" 
                 className="w-full h-auto object-cover"
               />
            </div>
          </div>
        </section>

        {/* Feature 3: Reports & Scalability */}
        <section className="w-full py-20 md:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
             <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-blue-700">
                Phase 3: Reports & Scalability
              </h2>
            </div>
            
            <div className="mx-auto max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-white bg-white hover:shadow-blue-200/50 transition-shadow duration-500">
               <img 
                 src="/phase3.png" 
                 alt="Phase 3 Scalability" 
                 className="w-full h-auto object-cover"
               />
            </div>
            
             <div className="flex justify-center mt-12">
               <Link
                  href="/login"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-10 py-3 text-lg font-bold text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1"
                >
                  Mulai Gunakan Sekarang
                </Link>
             </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t bg-slate-50 py-10">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-400 grayscale">omBot</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} omBot Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
