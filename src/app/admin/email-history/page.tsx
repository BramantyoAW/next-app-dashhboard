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
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Email Delivery History</h1>
          <p className="ds-hint">Lacak dan kelola riwayat pengiriman notifikasi sistem</p>
        </div>
        <button 
          onClick={() => fetchHistory(page)}
          className="ds-btn"
          data-variant="secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="ds-card overflow-hidden">
        <div className="ds-table-wrap" style={{ marginTop: 0, border: 0, borderRadius: 0 }}>
          <table className="ds-table text-left">
            <thead className="ds-thead">
              <tr>
                <th className="ds-section-label">Penerima &amp; Subjek</th>
                <th className="ds-section-label text-center">Tanggal Kirim</th>
                <th className="ds-section-label text-center">Status</th>
                <th className="ds-section-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td><div className="h-10 rounded-lg w-full" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                    <td><div className="h-10 rounded-lg w-24 mx-auto" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                    <td><div className="h-10 rounded-lg w-20 mx-auto" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                    <td className="text-right"><div className="h-10 rounded-lg w-10 ml-auto" style={{ background: 'var(--ds-surface-2)' }}></div></td>
                  </tr>
                ))
              ) : emailHistory.length > 0 ? (
                emailHistory.map((history) => (
                  <tr key={history.id}>
                    <td>
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 600, color: 'var(--ds-fg)' }}>{history.to}</span>
                        <span className="ds-small truncate max-w-md">{history.subject}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="ds-small whitespace-nowrap">
                        {formatDateTime(history.created_at)}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center">
                        {history.status === 'sent' ? (
                          <span className="ds-badge inline-flex items-center gap-1.5" data-tone="ok">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            SENT
                          </span>
                        ) : (
                          <span className="ds-badge inline-flex items-center gap-1.5" data-tone="bad">
                            <XCircle className="w-3.5 h-3.5" />
                            FAILED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleResend(history.id)}
                        disabled={resending === history.id}
                        className="ds-btn"
                        data-variant="ghost"
                        title="Kirim Ulang Email"
                        aria-label="Kirim ulang email"
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
                  <td colSpan={4}>
                    <div className="ds-empty" style={{ padding: '48px 0' }}>
                      <History className="ds-empty-icon w-16 h-16" />
                      <p className="ds-h2">Belum ada riwayat email</p>
                      <p className="ds-caption mt-1">Email yang dikirim sistem akan muncul di sini</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'var(--ds-surface-2)', borderTop: '1px solid var(--ds-border)' }}
        >
          <p className="ds-small">
            Showing <span style={{ color: 'var(--ds-fg)', fontWeight: 600 }}>{emailHistory.length}</span> of <span style={{ color: 'var(--ds-fg)', fontWeight: 600 }}>{totalItems}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="ds-btn"
              data-variant="secondary"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="ds-small px-4" style={{ color: 'var(--ds-fg)', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="ds-btn"
              data-variant="secondary"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
