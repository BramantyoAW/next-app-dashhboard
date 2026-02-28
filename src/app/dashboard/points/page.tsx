'use client';

import React, { useEffect, useState } from 'react';
import { useProfile } from '@/app/dashboard/layout';
import { getMyPointsService, getPointHistoriesService } from '@/graphql/query/points/getPointServices';
import { getMidtransSnapTokenService, syncPaymentStatusService } from '@/graphql/mutation/points/topupService';
import { Coins, Plus, History, ArrowUpRight, ArrowDownLeft, Clock, Info, CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    snap: any;
  }
}

export default function PointsPage() {
  const profile = useProfile();
  const [points, setPoints] = useState(0);
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10000);

  const storeId = profile?.me?.user?.store_id;

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const [pointsRes, historiesRes] = await Promise.all([
        getMyPointsService(token, storeId),
        getPointHistoriesService(token, storeId)
      ]);
      setPoints(pointsRes.getMyPoints);
      setHistories(historiesRes.getPointHistories.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Load Midtrans Snap Script
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'SB-Mid-client-...'); // Will be handled by service
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [storeId]);

  const handleTopup = async () => {
    setTopupLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await getMidtransSnapTokenService(token, storeId, topupAmount);
      const snapToken = res.getMidtransSnapToken.token;
      const orderId = res.getMidtransSnapToken.order_id || ''; 

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Credit & Points</h1>
          <p className="text-slate-500 mt-1">Kelola saldo poin Anda untuk operasional toko</p>
        </div>
        <button 
          onClick={() => setShowTopupModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> Top-up Points
        </button>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Coins size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Coins size={18} className="text-blue-200" />
              <span className="text-sm font-bold tracking-wide uppercase">Available Balance</span>
            </div>
            <div>
              <div className="text-6xl font-black">{points.toLocaleString()}</div>
              <div className="text-blue-100 mt-2 font-medium">Credits remaining</div>
            </div>
            <div className="pt-4 flex items-center gap-2 text-blue-100 text-sm italic">
                <Info size={16} />
                <span>1 poin akan dikurangi untuk setiap order yang berhasil diselesaikan.</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-col justify-center items-center text-center space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Plus size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-xl text-center">Rp 10.000 / 100 Pts</h3>
            <p className="text-sm text-slate-500 mt-1 text-center">Harga terbaik untuk pertumbuhan bisnis Anda</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <History size={20} className="text-slate-400" />
          <h2 className="font-bold text-slate-900">Point History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Note</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6"><div className="h-4 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : histories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">Belum ada riwayat transaksi poin</td>
                </tr>
              ) : (
                histories.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {h.amount > 0 ? (
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowUpRight size={18}/></div>
                        ) : (
                          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ArrowDownLeft size={18}/></div>
                        )}
                        <span className="font-bold text-slate-900 capitalize">{h.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-lg font-black ${h.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.amount > 0 ? '+' : ''}{h.amount}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-600">{h.note}</td>
                    <td className="px-8 py-6 text-right whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(h.created_at))}</div>
                      <div className="text-xs text-slate-400">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(h.created_at))}</div>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowTopupModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
                <Plus size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Top-up Points</h2>
              <p className="text-slate-500">Pilih jumlah poin yang ingin Anda beli</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[10000, 50000, 100000, 250000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTopupAmount(amount)}
                  className={`p-6 rounded-2xl border-2 transition-all text-center space-y-1 ${topupAmount === amount ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  <div className="font-black text-lg">{(amount/100).toLocaleString()} Pts</div>
                  <div className="text-xs font-bold opacity-60">Rp {amount.toLocaleString()}</div>
                </button>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={handleTopup}
                disabled={topupLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {topupLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <CheckCircle2 size={24} />}
                {topupLoading ? 'Processing...' : `Bayar Rp ${topupAmount.toLocaleString()}`}
              </button>
              <button
                onClick={() => setShowTopupModal(false)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-4 rounded-2xl transition-all"
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
