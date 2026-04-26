'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useProfile } from '@/app/dashboard/layout'
import {
  MessageCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Unlink,
  Link2,
  Zap,
  Bot,
  Monitor,
  Shield,
  AlertCircle
} from 'lucide-react'

const BAALEYS_BASE = '/api/baileys'

type WAStatus = 'not_initialized' | 'connecting' | 'open' | 'close'
type TGStatus = 'not_initialized' | 'connecting' | 'connected' | 'error'

export default function GatewaySettingsPage() {
  const profile = useProfile()
  const merchantId = profile?.me?.user?.store_id ?? profile?.me?.user?.id

  // ─── WhatsApp State ───────────────────────────────
  const [waStatus, setWaStatus] = useState<WAStatus>('not_initialized')
  const [waQR, setWaQR] = useState<string | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const waPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollWAStatus = useCallback(async () => {
    if (!merchantId) return
    try {
      const res = await fetch(`${BAALEYS_BASE}/wa/session/${merchantId}/status`)
      if (!res.ok) return
      const data = await res.json()
      setWaStatus(data.state ?? data.status ?? 'not_initialized')

      if (data.state === 'open') {
        clearInterval(waPollingRef.current!)
        waPollingRef.current = null
        setWaQR(null)
        return
      }

      if (data.state === 'connecting') {
        const qrRes = await fetch(`${BAALEYS_BASE}/wa/session/${merchantId}/qr`)
        if (qrRes.ok) {
          const qrData = await qrRes.json()
          setWaQR(qrData.qr ?? null)
        }
      }

      if (data.state === 'close') {
        clearInterval(waPollingRef.current!)
        waPollingRef.current = null
        setWaQR(null)
      }
    } catch (_) {}
  }, [merchantId])

  const startWAPolling = () => {
    waPollingRef.current = setInterval(pollWAStatus, 3000)
  }

  const handleWaconnect = async () => {
    if (!merchantId) return
    setWaLoading(true)
    setWaError(null)
    setWaQR(null)
    setWaStatus('connecting')
    try {
      const res = await fetch(`${BAALEYS_BASE}/wa/session/${merchantId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      startWAPolling()
    } catch (err: any) {
      setWaError(err.message)
      setWaStatus('not_initialized')
    } finally {
      setWaLoading(false)
    }
  }

  const handleWadisconnect = async () => {
    if (!merchantId) return
    setWaLoading(true)
    try {
      await fetch(`${BAALEYS_BASE}/wa/session/${merchantId}`, { method: 'DELETE' })
    } catch (_) {}
    clearInterval(waPollingRef.current!)
    waPollingRef.current = null
    setWaQR(null)
    setWaStatus('not_initialized')
    setWaLoading(false)
  }

  useEffect(() => {
    if (!merchantId) return
    pollWAStatus()
    return () => {
      if (waPollingRef.current) clearInterval(waPollingRef.current)
    }
  }, [merchantId, pollWAStatus])

  // ─── Telegram State ─────────────────────────────────
  const [tgStatus, setTgStatus] = useState<TGStatus>('not_initialized')
  const [tgToken, setTgToken] = useState('')
  const [tgLoading, setTgLoading] = useState(false)
  const [tgError, setTgError] = useState<string | null>(null)

  const pollTGStatus = useCallback(async () => {
    if (!merchantId) return
    try {
      const res = await fetch(`${BAALEYS_BASE}/tg/status/${merchantId}`)
      if (!res.ok) return
      const data = await res.json()
      setTgStatus(data.connected ? 'connected' : 'not_initialized')
      if (data.token) setTgToken(data.token)
    } catch (_) {}
  }, [merchantId])

  useEffect(() => {
    if (!merchantId) return
    pollTGStatus()
  }, [merchantId, pollTGStatus])

  const handleTGconnect = async () => {
    if (!merchantId || !tgToken.trim()) return
    setTgLoading(true)
    setTgError(null)
    setTgStatus('connecting')
    try {
      const res = await fetch(`${BAALEYS_BASE}/tg/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, botToken: tgToken.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setTgStatus('connected')
    } catch (err: any) {
      setTgError(err.message)
      setTgStatus('error')
    } finally {
      setTgLoading(false)
    }
  }

  const handleTGdisconnect = async () => {
    if (!merchantId) return
    setTgLoading(true)
    try {
      await fetch(`${BAALEYS_BASE}/tg/disconnect/${merchantId}`, { method: 'DELETE' })
    } catch (_) {}
    setTgStatus('not_initialized')
    setTgToken('')
    setTgLoading(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-400 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengaturan Gateway</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola koneksi WhatsApp, Telegram, dan Browser Chat</p>
        </div>
      </div>

      {/* Merchant ID info */}
      {merchantId && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-medium text-blue-700">
          <Zap size={14} className="text-blue-500" />
          <span>Merchant ID: <strong className="font-bold">{merchantId}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Section A: WhatsApp ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <MessageCircle size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 tracking-tight">WhatsApp (Baileys)</h2>
              <p className="text-[11px] text-slate-400 font-medium">Koneksi via aplikasi WhatsApp</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <StatusBadge status={waStatus} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            {waError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-medium text-red-600">
                <XCircle size={14} />
                {waError}
              </div>
            )}

            {waStatus === 'open' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">Terhubung</p>
                    <p className="text-xs text-emerald-600 font-medium">WhatsApp aktif dan siap menerima pesan</p>
                  </div>
                </div>
                <button
                  onClick={handleWadisconnect}
                  disabled={waLoading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50 shadow-sm"
                >
                  {waLoading ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />}
                  Putuskan Koneksi
                </button>
              </div>
            ) : waStatus === 'connecting' && waQR ? (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <p className="text-sm font-bold text-slate-600">Pindai QR Code dengan aplikasi WhatsApp</p>
                  <div className="inline-block p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <img src={waQR} alt="WhatsApp QR" className="w-48 h-48 object-contain" />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                    <Loader2 size={12} className="animate-spin" />
                    Menunggu verifikasi...
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <MessageCircle size={20} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-500 font-medium leading-relaxed">
                    Mulai koneksi dengan akun WhatsApp Anda. QR code akan muncul dan dapat dipindai dalam 60 detik.
                  </div>
                </div>
                <button
                  onClick={handleWaconnect}
                  disabled={waLoading || !merchantId}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-brand text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-md"
                >
                  {waLoading ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                  Mulai Koneksi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section B: Telegram ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Bot size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 tracking-tight">Telegram</h2>
              <p className="text-[11px] text-slate-400 font-medium">Koneksi via Telegram Bot</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <StatusBadge status={tgStatus === 'connected' ? 'connected' : tgStatus === 'connecting' ? 'connecting' : 'not_initialized'} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            {tgError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-medium text-red-600">
                <AlertCircle size={14} />
                {tgError}
              </div>
            )}

            {tgStatus === 'connected' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">Terhubung</p>
                    <p className="text-xs text-emerald-600 font-medium">Bot Telegram aktif dan siap menerima pesan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono text-slate-500 break-all">
                  {tgToken.slice(0, 20)}...{tgToken.slice(-10)}
                </div>
                <button
                  onClick={handleTGdisconnect}
                  disabled={tgLoading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50 shadow-sm"
                >
                  {tgLoading ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />}
                  Putuskan Koneksi
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Bot Token (dari @BotFather)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 123456789:ABCDefGhi..."
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-800 placeholder:text-slate-400"
                    disabled={tgLoading}
                  />
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <Bot size={20} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-500 font-medium leading-relaxed">
                    Masukkan token bot Telegram dari @BotFather untuk menghubungkan akun Telegram Anda dengan omBot.
                  </div>
                </div>
                <button
                  onClick={handleTGconnect}
                  disabled={tgLoading || !merchantId || !tgToken.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-md"
                >
                  {tgLoading ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                  Hubungkan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section C: Browser Chat ──────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <Monitor size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 tracking-tight">Browser Chat</h2>
              <p className="text-[11px] text-slate-400 font-medium">Chat langsung dari browser / website</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-widest">
                Segera Hadir
              </span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 flex-shrink-0">
                <Monitor size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-700">Fitur dalam pengembangan</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                  User yang login ke dashboard OmBot akan langsung masuk ke chat gateway ini. Tidak perlu instal aplikasi — cukup buka browser dan mulai percakapan. Fitur ini akan segera hadir di versi berikutnya.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Shield size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Keamanan end-to-end • Real-time WebSocket • No install</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open' || status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Terhubung
      </span>
    )
  }
  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-widest">
        <Loader2 size={10} className="animate-spin" />
        Menghubungkan
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full text-[10px] font-black text-red-600 uppercase tracking-widest">
        <XCircle size={10} />
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
      Belum Terhubung
    </span>
  )
}