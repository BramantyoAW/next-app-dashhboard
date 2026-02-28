'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminGetAllStoresService } from "@/graphql/query/admin/getAllStores";
import { adminCreateStoreService } from "@/graphql/mutation/admin/createStore";
import { adminAssignUserToStoreService } from "@/graphql/mutation/admin/assignUserToStore";
import { adminGetAllUsersService } from "@/graphql/query/admin/getAllUsers";
import { getPointHistoriesService } from "@/graphql/query/points/getPointServices";
import { adminAdjustStoreBalanceService } from "@/graphql/mutation/admin/adjustStoreBalance";
import { Store, UserPlus, Plus, History, Coins, X, ArrowUpRight, ArrowDownLeft, Clock, PlusCircle } from "lucide-react";

export default function AdminStoresPage() {
  const router = useRouter();

  const [stores, setStores] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal controls
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [assignData, setAssignData] = useState({
    user_id: "",
    store_id: "",
    role: "owner",
  });

  const [users, setUsers] = useState<any[]>([]);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pointHistories, setPointHistories] = useState<any[]>([]);

  // Adjust Balance Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({
    amount: 0,
    note: "",
  });
  const [adjusting, setAdjusting] = useState(false);

  const loadStores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      const res = await adminGetAllStoresService(token, limit);
      setStores(res.getAllStores.data);
      setPagination(res.getAllStores.pagination);

      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed to load stores");
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");  // Redirect to login if no token
        return;
      }
      const res = await adminGetAllUsersService(token, 100, 1);
      setUsers(res.getAllUsers.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStore = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await adminCreateStoreService(token, storeName);
      alert("Store created!");

      setShowAddStore(false);
      setStoreName("");

      loadStores();
    } catch (err) {
      console.error(err);
      alert("Failed to create store");
    }
  };
  
  const handleAssign = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No authentication token found. Please log in again.");
        router.push("/login");
        return;
      }
      
      await adminAssignUserToStoreService(token, assignData);
      alert("User assigned to store!");
      setShowAssignModal(false);
      setAssignData({ user_id: "", store_id: "", role: "owner" });
    } catch (err) {
      console.error(err);
      alert("Failed to assign user");
    }
  };

  const handleShowHistory = async (store: any) => {
    setSelectedStore(store);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await getPointHistoriesService(token, store.id);
      setPointHistories(res.getPointHistories.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (adjustData.amount === 0) {
        alert("Amount cannot be zero.");
        return;
    }
    setAdjusting(true);
    try {
      const token = localStorage.getItem("token") || "";
      await adminAdjustStoreBalanceService(
        token,
        selectedStore.id,
        adjustData.amount,
        adjustData.note
      );
      alert("Balance adjusted successfully!");
      setShowAdjustModal(false);
      setAdjustData({ amount: 0, note: "" });
      loadStores(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Failed to adjust balance.");
    } finally {
      setAdjusting(false);
    }
  };

  useEffect(() => {
    loadStores();
    loadUsers(); // for assign user modal
  }, [page]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Stores</h1>

        <div className="space-x-3">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Assign User to Store
          </button>

          <button
            onClick={() => setShowAddStore(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            + Add Store
          </button>
        </div>
      </div>

      {/* Store Table */}
      <div className="bg-white shadow-lg rounded-xl p-6 border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Image</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Store Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <td className="px-6 py-4 text-sm text-slate-500 font-medium">#{store.id}</td>
                <td className="px-6 py-4">
                  {store.image ? (
                    <img 
                      src={store.image} 
                      alt={store.name} 
                      className="w-10 h-10 object-cover rounded-xl border border-slate-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <Store size={18} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{store.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Coins size={16} />
                    </div>
                    <span className="font-black text-slate-900">{store.points?.toLocaleString() ?? 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(store.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedStore(store);
                            setShowAdjustModal(true);
                        }}
                        className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors inline-flex items-center gap-2 font-bold text-sm"
                        title="Adjust Balance"
                    >
                        <PlusCircle size={18} /> Points
                    </button>
                    <button
                        onClick={() => handleShowHistory(store)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors inline-flex items-center gap-2 font-bold text-sm"
                        title="View Credit History"
                    >
                        <History size={18} /> Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span>
            Page {pagination.current_page} of {pagination.total_pages}
          </span>

          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Store Modal */}
      {showAddStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Add New Store</h2>

            <div>
              <label className="font-medium">Store Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddStore(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStore}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User to Store Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Assign User to Store</h2>

            {/* Select User */}
            <div>
              <label className="font-medium">User</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={assignData.user_id}
                onChange={(e) =>
                  setAssignData({ ...assignData, user_id: e.target.value })
                }
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Store */}
            <div>
              <label className="font-medium">Store</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={assignData.store_id}
                onChange={(e) =>
                  setAssignData({ ...assignData, store_id: e.target.value })
                }
              >
                <option value="">Select store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="font-medium">Role</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={assignData.role}
                onChange={(e) =>
                  setAssignData({ ...assignData, role: e.target.value })
                }
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Credit History</h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedStore?.name} (ID: #{selectedStore?.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  <p className="text-slate-400 font-bold animate-pulse">Loading history...</p>
                </div>
              ) : pointHistories.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
                    <History size={32} />
                  </div>
                  <p className="text-slate-400 italic font-medium">Belum ada riwayat transaksi poin untuk toko ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pointHistories.map((h) => (
                    <div key={h.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${h.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {h.amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 capitalize">{h.type.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500 font-medium">{h.note}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${h.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.amount > 0 ? '+' : ''}{h.amount}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 text-slate-400 mt-1">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total Points</span>
                  <span className="text-lg font-black text-blue-600">{selectedStore?.points?.toLocaleString() ?? 0}</span>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <PlusCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Adjust Balance</h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedStore?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount (Use negative for deduction)</label>
                  <input
                    type="number"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all font-black text-lg"
                    placeholder="e.g. 100 or -50"
                    value={adjustData.amount}
                    onChange={(e) => setAdjustData({ ...adjustData, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Note / Reason</label>
                  <textarea
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all min-h-[120px]"
                    placeholder="e.g. Promo ramadhan, Gift, atau Koreksi saldo"
                    value={adjustData.note}
                    onChange={(e) => setAdjustData({ ...adjustData, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAdjustBalance}
                  disabled={adjusting || adjustData.amount === 0 || !adjustData.note}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                >
                  {adjusting ? <div className="animate-spin h-6 w-6 border-2 border-white/30 border-t-white rounded-full" /> : <Coins size={20} />}
                  {adjusting ? 'Processing...' : 'Submit Adjustment'}
                </button>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-[20px] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
