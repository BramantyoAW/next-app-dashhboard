'use client';

import React, { useState, useEffect } from "react";
import { History, RefreshCw, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { adminGetAllEmailHistory } from "@/graphql/query/settings/getAllEmailHistory";
import { adminResendEmail } from "@/graphql/mutation/settings/resendEmail";

export default function EmailHistoryPage() {
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchHistory = async (pageNumber: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await adminGetAllEmailHistory(token, 10, pageNumber);
      setEmailHistory(res.getAllEmailHistory.data);
      setTotalPages(res.getAllEmailHistory.meta.pagination.total_pages);
      setTotalItems(res.getAllEmailHistory.meta.pagination.total);
      setPage(res.getAllEmailHistory.meta.pagination.current_page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handleResend = async (id: string) => {
    setResending(id);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await adminResendEmail(token, id);
      alert("Email berhasil dikirim ulang!");
      fetchHistory(page);
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengirim ulang email: " + err.message);
    } finally {
      setResending(null);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Email Delivery History</h1>
          <p className="text-slate-500 mt-1">Lacak dan kelola riwayat pengiriman notifikasi sistem</p>
        </div>
        <button 
          onClick={() => fetchHistory(page)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Penerima & Subjek</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Tanggal Kirim</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-24 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-20 mx-auto"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-10 bg-slate-100 rounded-lg w-10 ml-auto"></div></td>
                  </tr>
                ))
              ) : emailHistory.length > 0 ? (
                emailHistory.map((history) => (
                  <tr key={history.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{history.to}</span>
                        <span className="text-sm text-slate-500 truncate max-w-md">{history.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(history.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {history.status === 'sent' ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            SENT
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100 shadow-sm">
                            <XCircle className="w-3.5 h-3.5" />
                            FAILED
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleResend(history.id)}
                        disabled={resending === history.id}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 disabled:opacity-50 group-hover:shadow-sm"
                        title="Kirim Ulang Email"
                      >
                        {resending === history.id ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-medium">Belum ada riwayat email</p>
                    <p className="text-sm mt-1">Email yang dikirim sistem akan muncul di sini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900">{emailHistory.length}</span> of <span className="text-slate-900">{totalItems}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold px-4 text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all font-semibold"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
