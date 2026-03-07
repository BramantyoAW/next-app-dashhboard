'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { adminGetPaymentHistoriesService } from '@/graphql/query/points/getPaymentHistories';
import { History, Search, Filter, Eye, Clock, CheckCircle2, XCircle, AlertCircle, X, MapPin, Phone, Info, Calendar, DollarSign } from 'lucide-react';

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
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-emerald-200"><CheckCircle2 size={12} strokeWidth={3}/> Success</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-amber-200"><Clock size={12} strokeWidth={3}/> Pending</span>;
      case 'expire':
      case 'cancel':
      case 'failure':
        return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-rose-200"><XCircle size={12} strokeWidth={3}/> Failed</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-slate-200"><AlertCircle size={12} strokeWidth={3}/> {status}</span>;
    }
  };

  const StoreDetailModal = (store: any) => {
    if (!mounted || !store) return null;

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="relative h-48 bg-slate-100 flex-shrink-0">
            {store.image ? (
              <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
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
              <div className="w-24 h-24 rounded-3xl bg-white p-2 shadow-xl border border-slate-100">
                <div className="w-full h-full rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden">
                   {store.image ? (
                     <img src={store.image} alt="Logo" className="w-full h-full object-cover" />
                   ) : (
                     <Info size={32} className="text-slate-300" />
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="pt-14 px-8 pb-8 space-y-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{store.name}</h3>
              <p className="text-sm font-medium text-slate-400 mt-1">{store.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                 <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                   <Phone size={18} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Phone Number</p>
                   <p className="text-sm font-bold text-slate-900">{store.phone || '-'}</p>
                 </div>
               </div>

               <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                 <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                   <MapPin size={18} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Address</p>
                   <p className="text-sm font-bold text-slate-900 leading-relaxed">{store.address || '-'}</p>
                 </div>
               </div>
            </div>
            
            <button 
              onClick={() => setSelectedStore(null)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-95 text-sm"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <History className="text-blue-600" size={32} /> Payment History
          </h1>
          <p className="text-slate-500 font-medium mt-1">Monitor all Midtrans transactions and top-up activities</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all duration-300">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search Order ID or Store name..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold text-slate-900 shadow-sm placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95">
            <Filter size={20} className="text-slate-400" /> 
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6">
                      <div className="flex gap-4 items-center">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <History size={64} />
                      <p className="text-xl font-black italic">No payment history found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => (
                  <tr key={payment.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(payment.created_at))}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(payment.created_at))}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
                          {payment.store?.image ? (
                            <img src={payment.store.image} alt="Store" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                              <Info size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">{payment.external_id}</p>
                          <p className="text-sm font-bold text-slate-900 leading-none">{payment.store?.name || 'Unknown Store'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <DollarSign size={14} strokeWidth={3} />
                        </div>
                        <span className="text-base font-black text-slate-900 tracking-tight">Rp {payment.amount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedStore(payment.store)}
                        className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 rounded-2xl transition-all active:scale-90 group/btn" 
                        title="View Store Details"
                      >
                        <Eye size={20} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-sm text-slate-500 font-bold">Showing page <span className="text-slate-900">{pagination.current_page}</span> of <span className="text-slate-900">{pagination.total_pages}</span></span>
            <div className="flex gap-3">
              <button 
                onClick={() => loadPayments(pagination.current_page - 1, searchTerm)}
                disabled={pagination.current_page === 1}
                className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-95"
              >
                Previous
              </button>
              <button 
                onClick={() => loadPayments(pagination.current_page + 1, searchTerm)}
                disabled={pagination.current_page === pagination.total_pages}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xl shadow-blue-500/20 active:scale-95"
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
