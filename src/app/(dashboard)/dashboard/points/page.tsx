'use client';

import React, { useEffect, useState } from 'react';
import { useProfile } from '@/app/(dashboard)/dashboard/layout';
import {
  getMyPointsService,
  getPointHistoriesService,
  getMyAiPointsService,
  getAiPointHistoriesService,
  type AiPointLog,
  type PointLog,
} from '@/graphql/query/points/getPointServices';
import { getMidtransSnapTokenService, syncPaymentStatusService } from '@/graphql/mutation/points/topupService';
import { Coins, Plus, History, ArrowUpRight, ArrowDownLeft, Info, CheckCircle2, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    snap: any;
  }
}

export default function PointsPage() {
  const profile = useProfile();
  const [points, setPoints] = useState(0);
  const [histories, setHistories] = useState<PointLog[]>([]);
  // AI Point: saldo terpisah, dipotong oleh fitur AI (Design & Assistance).
  const [aiPoints, setAiPoints] = useState(0);
  const [aiHistories, setAiHistories] = useState<AiPointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10000);
  // Jenis saldo yang mau diisi: poin order atau AI Point.
  const [topupPurpose, setTopupPurpose] = useState<'order' | 'ai'>('order');

  const storeId = profile?.me?.user?.store_id;

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const [pointsRes, historiesRes, aiPointsRes, aiHistoriesRes] = await Promise.all([
        getMyPointsService(token, storeId),
        getPointHistoriesService(token, storeId),
        // Kegagalan salah satu sumber tidak boleh mengosongkan seluruh halaman.
        getMyAiPointsService(token).catch(() => null),
        getAiPointHistoriesService(token).catch(() => null),
      ]);
      setPoints(pointsRes.getMyPoints);
      setHistories(historiesRes.getPointHistories.data);
      const aiSaldo = aiPointsRes?.getMyAiPoints ?? 0;
      setAiPoints(aiSaldo);
      setAiHistories(aiHistoriesRes?.getAiPointHistories?.data ?? []);
      // Beri tahu header agar angka AI Point ikut diperbarui (mis. setelah top-up).
      window.dispatchEvent(new CustomEvent('aiPointsChanged', { detail: { aiPoints: aiSaldo } }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  /**
   * Dynamically loads the correct Midtrans Snap.js script
   * based on whether the backend is configured for production or sandbox.
   */
  const loadSnapScript = (isProduction: boolean, clientKey: string): Promise<void> => {
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    // If already loaded with the same src, skip
    const existing = document.querySelector(`script[src="${snapUrl}"]`) as HTMLScriptElement | null;
    if (existing) {
      return Promise.resolve();
    }

    // Remove any previously loaded Snap script (in case mode switched)
    const oldScripts = document.querySelectorAll('script[src*="midtrans.com/snap/snap.js"]');
    oldScripts.forEach(s => s.remove());
    // Reset snap object so it re-initializes
    delete (window as any).snap;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = snapUrl;
      script.setAttribute('data-client-key', clientKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Midtrans Snap script'));
      document.body.appendChild(script);
    });
  };

  const handleTopup = async () => {
    setTopupLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await getMidtransSnapTokenService(token, storeId, topupAmount, topupPurpose);
      const { token: snapToken, order_id: orderId, client_key: clientKey, is_production: isProduction } = res.getMidtransSnapToken;

      // Load the correct Snap.js before calling snap.pay
      await loadSnapScript(isProduction, clientKey);

      if (window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            console.log('success', result);
            await syncPaymentStatusService(token, result.order_id);
            setShowTopupModal(false);
            loadData();
          },
          onPending: async (result: any) => {
            console.log('pending', result);
            await syncPaymentStatusService(token, result.order_id);
            setShowTopupModal(false);
            loadData();
          },
          onError: (result: any) => {
            console.log('error', result);
          },
          onClose: async () => {
            console.log('customer closed the popup without finishing the payment');
            if (orderId) {
              await syncPaymentStatusService(token, orderId);
            }
            loadData();
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initiate top-up.');
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Credit &amp; Points</h1>
          <p className="ds-hint">Kelola saldo poin Anda untuk operasional toko</p>
        </div>
        <button 
          onClick={() => setShowTopupModal(true)}
          className="ds-btn"
          data-variant="primary"
        >
          <Plus size={18} /> Top-up Points
        </button>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="col-span-1 md:col-span-2 p-8 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, var(--ds-primary), var(--ds-primary-hover))',
            borderRadius: 'var(--ds-radius)',
            boxShadow: 'var(--ds-shadow-lg)',
            color: 'var(--ds-primary-fg)',
          }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Coins size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 w-fit px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.14)' }}>
              <Coins size={18} />
              <span className="ds-section-label" style={{ color: 'inherit', opacity: 0.85 }}>Available Balance</span>
            </div>
            <div>
              <div className="ds-num" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05 }}>{points.toLocaleString()}</div>
              <div className="mt-2" style={{ opacity: 0.8 }}>Credits remaining</div>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm italic" style={{ opacity: 0.8 }}>
                <Info size={16} />
                <span>1 poin akan dikurangi untuk setiap order yang berhasil diselesaikan.</span>
            </div>
          </div>
        </div>

        <div className="ds-card ds-card-pad flex flex-col justify-center items-center text-center space-y-4" style={{ padding: 32 }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-primary)' }}
          >
            <Plus size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="ds-h1">Rp 10.000 / 100 Pts</h3>
            <p className="ds-small mt-1">Harga terbaik untuk pertumbuhan bisnis Anda</p>
          </div>
        </div>
      </div>

      {/* AI Point — saldo khusus fitur AI, terpisah dari poin order */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="col-span-1 md:col-span-2 p-8 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a21caf)',
            borderRadius: 'var(--ds-radius)',
            boxShadow: 'var(--ds-shadow-lg)',
            color: '#fff',
          }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 w-fit px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.14)' }}>
              <Sparkles size={18} />
              <span className="ds-section-label" style={{ color: 'inherit', opacity: 0.85 }}>AI Point</span>
            </div>
            <div>
              <div className="ds-num" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05 }}>{aiPoints.toLocaleString()}</div>
              <div className="mt-2" style={{ opacity: 0.8 }}>Untuk fitur AI</div>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm italic" style={{ opacity: 0.8 }}>
              <Info size={16} />
              <span>1 AI Point dipakai untuk setiap permintaan AI (Design with OmBot AI &amp; Manage OmBot AI).</span>
            </div>
          </div>
        </div>

        <div className="ds-card ds-card-pad flex flex-col justify-center items-center text-center space-y-4" style={{ padding: 32 }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#faf5ff', color: '#7c3aed' }}
          >
            <Sparkles size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="ds-h1">
              {aiPoints <= 0 ? 'AI Point habis' : 'AI Point aktif'}
            </h3>
            <p className="ds-small mt-1">
              {aiPoints <= 0
                ? 'Top-up AI Point untuk memakai fitur AI.'
                : 'Fitur AI bisa dipakai selama saldo tersedia.'}
            </p>
          </div>
          {aiPoints <= 0 && (
            <button
              onClick={() => { setTopupPurpose('ai'); setShowTopupModal(true); }}
              className="ds-btn"
              data-variant="primary"
            >
              Top-up AI Point
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <div className="ds-card overflow-hidden">
        <div
          className="p-6 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
        >
          <History size={20} className="ds-icon-muted" />
          <h2 className="ds-h2">Point History</h2>
        </div>
        <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th className="ds-section-label">Type</th>
                <th className="ds-section-label">Amount</th>
                <th className="ds-section-label">Note</th>
                <th className="ds-section-label text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4}><div className="h-4 rounded" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                  </tr>
                ))
              ) : histories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center">
                    <span className="ds-caption">Belum ada riwayat transaksi poin</span>
                  </td>
                </tr>
              ) : (
                histories.map((h: PointLog) => (
                  <tr key={h.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {h.amount > 0 ? (
                          <div className="p-2 rounded-lg" style={{ background: '#f0fdf4', color: '#15803d' }}><ArrowUpRight size={18}/></div>
                        ) : (
                          <div className="p-2 rounded-lg" style={{ background: '#fef2f2', color: 'var(--ds-danger)' }}><ArrowDownLeft size={18}/></div>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--ds-fg)', textTransform: 'capitalize' }}>{h.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="ds-num"
                        style={{ fontSize: 16, fontWeight: 650, color: h.amount > 0 ? '#15803d' : 'var(--ds-danger)' }}
                      >
                        {h.amount > 0 ? '+' : ''}{h.amount}
                      </span>
                    </td>
                    <td className="ds-small">{h.note}</td>
                    <td className="text-right whitespace-nowrap">
                      <div className="ds-num" style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(h.created_at))}</div>
                      <div className="ds-caption">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(h.created_at))}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat AI Point */}
      <div className="ds-card overflow-hidden">
        <div
          className="p-6 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
        >
          <Sparkles size={20} style={{ color: '#7c3aed' }} />
          <h2 className="ds-h2">AI Point History</h2>
        </div>
        <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th className="ds-section-label">Fitur</th>
                <th className="ds-section-label">Amount</th>
                <th className="ds-section-label">Keterangan</th>
                <th className="ds-section-label text-right">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4}><div className="h-4 rounded" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                  </tr>
                ))
              ) : aiHistories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center">
                    <span className="ds-caption">Belum ada pemakaian AI Point</span>
                  </td>
                </tr>
              ) : (
                aiHistories.map((h: AiPointLog) => (
                  <tr key={h.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {h.amount > 0 ? (
                          <div className="p-2 rounded-lg" style={{ background: '#f0fdf4', color: '#15803d' }}><ArrowUpRight size={18} /></div>
                        ) : (
                          <div className="p-2 rounded-lg" style={{ background: '#faf5ff', color: '#7c3aed' }}><ArrowDownLeft size={18} /></div>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>
                          {h.feature === 'design' ? 'Design with OmBot AI'
                            : h.feature === 'assistance' ? 'Manage OmBot AI'
                            : 'Penambahan saldo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="ds-num"
                        style={{ fontSize: 16, fontWeight: 650, color: h.amount > 0 ? '#15803d' : '#7c3aed' }}
                      >
                        {h.amount > 0 ? '+' : ''}{h.amount}
                      </span>
                    </td>
                    <td className="ds-small">{h.note}</td>
                    <td className="text-right whitespace-nowrap">
                      <div className="ds-num" style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(h.created_at))}</div>
                      <div className="ds-caption">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(h.created_at))}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-sm transition-opacity"
            style={{ background: 'rgba(24,24,27,0.6)' }}
            onClick={() => setShowTopupModal(false)}
          />
          <div
            className="relative ds-card w-full max-w-md max-h-[88vh] overflow-y-auto p-6 sm:p-10 animate-in fade-in zoom-in duration-300"
            style={{ boxShadow: 'var(--ds-shadow-lg)' }}
          >
            <div className="text-center space-y-4">
              <div
                className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-primary)' }}
              >
                <Plus size={40} />
              </div>
              <h2 className="ds-h1">Top-up Points</h2>
              <p className="ds-hint mt-0">Pilih jenis saldo dan jumlah yang ingin Anda beli</p>
            </div>

            {/* Pilih jenis saldo: poin order atau AI Point */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setTopupPurpose('order')}
                className="p-4 text-center transition-all"
                style={{
                  borderRadius: 'var(--ds-radius-sm)',
                  border: `2px solid ${topupPurpose === 'order' ? 'var(--ds-primary)' : 'var(--ds-border)'}`,
                  background: topupPurpose === 'order' ? 'var(--ds-surface-2)' : 'transparent',
                  color: topupPurpose === 'order' ? 'var(--ds-primary)' : 'var(--ds-fg-muted)',
                }}
              >
                <Coins size={20} className="mx-auto mb-1" />
                <div style={{ fontWeight: 650, fontSize: 13 }}>Point Order</div>
                <div className="ds-caption" style={{ textTransform: 'none' }}>Untuk order masuk</div>
              </button>
              <button
                onClick={() => setTopupPurpose('ai')}
                className="p-4 text-center transition-all"
                style={{
                  borderRadius: 'var(--ds-radius-sm)',
                  border: `2px solid ${topupPurpose === 'ai' ? '#7c3aed' : 'var(--ds-border)'}`,
                  background: topupPurpose === 'ai' ? '#faf5ff' : 'transparent',
                  color: topupPurpose === 'ai' ? '#7c3aed' : 'var(--ds-fg-muted)',
                }}
              >
                <Sparkles size={20} className="mx-auto mb-1" />
                <div style={{ fontWeight: 650, fontSize: 13 }}>AI Point</div>
                <div className="ds-caption" style={{ textTransform: 'none' }}>Untuk fitur AI</div>
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[10000, 50000, 100000, 250000].map((amount) => {
                const active = topupAmount === amount;
                const accent = topupPurpose === 'ai' ? '#7c3aed' : 'var(--ds-primary)';
                return (
                  <button
                    key={amount}
                    onClick={() => setTopupAmount(amount)}
                    className="p-6 text-center space-y-1 transition-all"
                    style={{
                      borderRadius: 'var(--ds-radius-sm)',
                      border: `2px solid ${active ? accent : 'var(--ds-border)'}`,
                      background: active ? (topupPurpose === 'ai' ? '#faf5ff' : 'var(--ds-surface-2)') : 'transparent',
                      color: active ? accent : 'var(--ds-fg)',
                    }}
                  >
                    <div className="ds-num" style={{ fontWeight: 700, fontSize: 16 }}>{(amount/100).toLocaleString()} Pts</div>
                    <div className="ds-caption" style={{ textTransform: 'none' }}>Rp {amount.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={handleTopup}
                disabled={topupLoading}
                className="ds-btn w-full"
                data-variant="primary"
                style={{
                  height: 52,
                  justifyContent: 'center',
                  background: topupPurpose === 'ai' ? '#7c3aed' : undefined,
                  opacity: topupLoading ? 0.6 : 1,
                }}
              >
                {topupLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 size={20} />}
                {topupLoading ? 'Processing...' : `Bayar Rp ${topupAmount.toLocaleString()} untuk ${topupPurpose === 'ai' ? 'AI Point' : 'Point Order'}`}
              </button>
              <button
                onClick={() => setShowTopupModal(false)}
                className="ds-btn w-full"
                data-variant="secondary"
                style={{ height: 48, justifyContent: 'center' }}
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
