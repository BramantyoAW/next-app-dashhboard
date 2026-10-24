'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useProfile } from '@/app/(dashboard)/dashboard/layout'
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
          <h1 className="ds-display">Pengaturan Gateway</h1>
          <p className="ds-hint">Kelola koneksi WhatsApp, Telegram, dan Browser Chat</p>
        </div>
      </div>

      {/* Merchant ID info */}
      {merchantId && (
        <div className="ds-well flex items-center gap-2" data-tone="accent">
          <Zap size={14} className="ds-accent-text" />
          <span>Merchant ID: <strong>{merchantId}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Section A: WhatsApp ─────────────────────── */}
        <div className="ds-card overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <MessageCircle size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="ds-h2">WhatsApp (Baileys)</h2>
              <p className="ds-caption">Koneksi via aplikasi WhatsApp</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <StatusBadge status={waStatus} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            {waError && (
              <div className="ds-alert" data-tone="bad">
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
                  className="ds-btn w-full"
                  data-variant="danger"
                >
                  {waLoading ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />}
                  Putuskan Koneksi
                </button>
              </div>
            ) : waStatus === 'connecting' && waQR ? (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <p className="ds-body">Pindai QR Code dengan aplikasi WhatsApp</p>
                  <div className="ds-card inline-block p-3">
                    <img src={waQR} alt="WhatsApp QR" className="w-48 h-48 object-contain" />
                  </div>
                  <div className="flex items-center justify-center gap-2 ds-caption">
                    <Loader2 size={12} className="animate-spin" />
                    Menunggu verifikasi...
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="ds-well flex items-start gap-3">
                  <MessageCircle size={20} className="ds-icon-muted mt-0.5 flex-shrink-0" />
                  <div>
                    Mulai koneksi dengan akun WhatsApp Anda. QR code akan muncul dan dapat dipindai dalam 60 detik.
                  </div>
                </div>
                <button
                  onClick={handleWaconnect}
                  disabled={waLoading || !merchantId}
                  className="ds-btn w-full"
                  data-variant="primary"
                >
                  {waLoading ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                  Mulai Koneksi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section B: Telegram ─────────────────────── */}
        <div className="ds-card overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}>
            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--ds-primary) 8%, var(--ds-surface))', color: 'var(--ds-primary)' }}
            >
              <Bot size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="ds-h2">Telegram</h2>
              <p className="ds-caption">Koneksi via Telegram Bot</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <StatusBadge status={tgStatus === 'connected' ? 'connected' : tgStatus === 'connecting' ? 'connecting' : 'not_initialized'} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            {tgError && (
              <div className="ds-alert" data-tone="bad">
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
                <div className="ds-well ds-mono break-all">
                  {tgToken.slice(0, 20)}...{tgToken.slice(-10)}
                </div>
                <button
                  onClick={handleTGdisconnect}
                  disabled={tgLoading}
                  className="ds-btn w-full"
                  data-variant="danger"
                >
                  {tgLoading ? <Loader2 className="animate-spin" size={16} /> : <Unlink size={16} />}
                  Putuskan Koneksi
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ds-label">
                    Bot Token (dari @BotFather)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 123456789:ABCDefGhi..."
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    className="ds-input ds-mono"
                    disabled={tgLoading}
                  />
                </div>
                <div className="ds-well flex items-start gap-3">
                  <Bot size={20} className="ds-icon-muted mt-0.5 flex-shrink-0" />
                  <div>
                    Masukkan token bot Telegram dari @BotFather untuk menghubungkan akun Telegram Anda dengan omBot.
                  </div>
                </div>
                <button
                  onClick={handleTGconnect}
                  disabled={tgLoading || !merchantId || !tgToken.trim()}
                  className="ds-btn w-full"
                  data-variant="primary"
                >
                  {tgLoading ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
                  Hubungkan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section C: Browser Chat ──────────────────── */}
        <div className="ds-card overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <Monitor size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="ds-h2">Browser Chat</h2>
              <p className="ds-caption">Chat langsung dari browser / website</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="ds-badge" data-tone="warn">
                Segera Hadir
              </span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-fg-muted)' }}>
                <Monitor size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="ds-h2">Fitur dalam pengembangan</h3>
                <p className="ds-body max-w-lg">
                  User yang login ke dashboard OmBot akan langsung masuk ke chat gateway ini. Tidak perlu instal aplikasi — cukup buka browser dan mulai percakapan. Fitur ini akan segera hadir di versi berikutnya.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Shield size={13} className="ds-icon-muted" />
                  <span className="ds-caption">Keamanan end-to-end • Real-time WebSocket • No install</span>
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
    <span className="ds-badge" data-tone="neutral">
      Belum Terhubung
    </span>
  )
}