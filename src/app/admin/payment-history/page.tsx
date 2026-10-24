'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { adminGetPaymentHistoriesService } from '@/graphql/query/points/getPaymentHistories';
import { History, Search, Filter, Eye, Clock, CheckCircle2, XCircle, AlertCircle, X, MapPin, Phone, Info, Calendar, DollarSign } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUtils';

export default function PaymentHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadPayments = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await adminGetPaymentHistoriesService(token ?? '', { 
        page, 
        limit: 10,
        search: search || undefined
      });
      setPayments(res.getPaymentHistories.data);
      setPagination(res.getPaymentHistories.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayments(1, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, loadPayments]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'settlement':
      case 'capture':
      case 'success':
        return <span className="ds-badge" data-tone="ok"><CheckCircle2 size={12} strokeWidth={3}/> Success</span>;
      case 'pending':
        return <span className="ds-badge" data-tone="warn"><Clock size={12} strokeWidth={3}/> Pending</span>;
      case 'expire':
      case 'cancel':
      case 'failure':
        return <span className="ds-badge" data-tone="bad"><XCircle size={12} strokeWidth={3}/> Failed</span>;
      default:
        return <span className="ds-badge" data-tone="neutral"><AlertCircle size={12} strokeWidth={3}/> {status}</span>;
    }
  };

  const StoreDetailModal = (store: any) => {
    if (!mounted || !store) return null;

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div className="ds-card w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="relative h-48 flex-shrink-0" style={{ background: 'var(--ds-surface-2)' }}>
            {store.image ? (
              <img src={resolveImageUrl(store.image)} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ds-primary), var(--ds-primary-hover))' }}>
                <History size={64} className="text-white/20" />
              </div>
            )}
            <button 
              onClick={() => setSelectedStore(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
            >
              <X size={20} />
            </button>
            <div className="absolute -bottom-10 left-8">
              <div className="w-24 h-24 rounded-[var(--ds-radius)] p-2" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', boxShadow: 'var(--ds-shadow-lg)' }}>
                <div className="w-full h-full rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: 'var(--ds-surface-2)' }}>
                   {store.image ? (
                     <img src={resolveImageUrl(store.image)} alt="Logo" className="w-full h-full object-cover" />
                   ) : (
                     <Info size={32} className="ds-icon-muted" />
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="pt-14 px-8 pb-8 space-y-6">
            <div>
              <h3 className="ds-h1 tracking-tight">{store.name}</h3>
              <p className="ds-small mt-1">{store.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <div className="flex items-start gap-4 ds-subcard">
                 <div className="w-10 h-10 rounded-2xl flex items-center justify-center ds-accent-text" style={{ background: 'var(--ds-surface)', boxShadow: 'var(--ds-shadow)' }}>
                   <Phone size={18} />
                 </div>
                 <div>
                   <p className="ds-caption uppercase tracking-widest leading-none mb-1">Phone Number</p>
                   <p className="ds-body font-bold">{store.phone || '-'}</p>
                 </div>
               </div>

               <div className="flex items-start gap-4 ds-subcard">
                 <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-emerald-600" style={{ background: 'var(--ds-surface)', boxShadow: 'var(--ds-shadow)' }}>
                   <MapPin size={18} />
                 </div>
                 <div>
                   <p className="ds-caption uppercase tracking-widest leading-none mb-1">Address</p>
                   <p className="ds-body font-bold leading-relaxed">{store.address || '-'}</p>
                 </div>
               </div>
            </div>
            
            <button 
              onClick={() => setSelectedStore(null)}
              className="ds-btn w-full"
              data-variant="primary"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-6">
      <div className="ds-page-head">
        <div>
          <h1 className="ds-display flex items-center gap-3 tracking-tight">
            <History className="ds-accent-text" size={32} /> Payment History
          </h1>
          <p className="ds-small mt-1">Monitor all Midtrans transactions and top-up activities</p>
        </div>
      </div>

      <div className="ds-card overflow-hidden transition-all duration-300">
        <div className="p-4 flex flex-col md:flex-row gap-4" style={{ background: 'var(--ds-surface-2)', borderBottom: '1px solid var(--ds-border)' }}>
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search Order ID or Store name..."
              className="ds-input w-full"
              style={{ paddingLeft: 40 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="ds-btn" data-variant="secondary">
            <Filter size={20} className="ds-icon-muted" /> 
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead className="ds-thead">
              <tr>
                <th>Date &amp; Time</th>
                <th>Transaction Info</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5}>
                      <div className="flex gap-4 items-center">
                        <div className="h-10 w-10 rounded-xl" style={{ background: 'var(--ds-surface-2)' }}></div>
                        <div className="h-4 rounded w-full" style={{ background: 'var(--ds-surface-2)' }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="ds-empty">
                      <div className="ds-empty-icon">
                        <History size={28} />
                      </div>
                      <p className="ds-h2 italic">No payment history found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl ds-icon-muted flex items-center justify-center" style={{ background: 'var(--ds-surface-2)' }}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="ds-body font-bold">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(payment.created_at))}</p>
                          <p className="ds-caption uppercase tracking-wider">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(payment.created_at))}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}>
                          {payment.store?.image ? (
                            <img src={resolveImageUrl(payment.store.image)} alt="Store" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center ds-icon-muted" style={{ background: 'var(--ds-surface-2)' }}>
                              <Info size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="ds-caption ds-accent-text uppercase tracking-widest leading-none mb-1">{payment.external_id}</p>
                          <p className="ds-body font-bold leading-none">{payment.store?.name || 'Unknown Store'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <DollarSign size={14} strokeWidth={3} />
                        </div>
                        <span className="ds-num font-bold tracking-tight">Rp {payment.amount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedStore(payment.store)}
                        className="ds-btn-sm" 
                        data-tone="neutral"
                        title="View Store Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}>
            <span className="ds-small">Showing page <span className="ds-num font-semibold" style={{ color: 'var(--ds-fg)' }}>{pagination.current_page}</span> of <span className="ds-num font-semibold" style={{ color: 'var(--ds-fg)' }}>{pagination.total_pages}</span></span>
            <div className="flex gap-3">
              <button 
                onClick={() => loadPayments(pagination.current_page - 1, searchTerm)}
                disabled={pagination.current_page === 1}
                className="ds-btn"
                data-variant="secondary"
              >
                Previous
              </button>
              <button 
                onClick={() => loadPayments(pagination.current_page + 1, searchTerm)}
                disabled={pagination.current_page === pagination.total_pages}
                className="ds-btn"
                data-variant="primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Store Detail Modal */}
      {selectedStore && StoreDetailModal(selectedStore)}
    </div>
  );
}
