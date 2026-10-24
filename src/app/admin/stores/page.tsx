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
import { resolveImageUrl } from '@/lib/imageUtils';

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
        <div
          className="animate-spin h-10 w-10 border-4 rounded-full"
          style={{ borderColor: 'var(--ds-primary)', borderTopColor: 'transparent' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="ds-page-head">
        <h1 className="ds-display">Manage Stores</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowAssignModal(true)}
            className="ds-btn"
            data-variant="secondary"
          >
            Assign User to Store
          </button>

          <button
            onClick={() => setShowAddStore(true)}
            className="ds-btn"
            data-variant="primary"
          >
            + Add Store
          </button>
        </div>
      </div>

      {/* Store Table */}
      <div className="ds-card ds-card-pad">
        <div className="ds-table-wrap">
        <table className="ds-table">
          <thead className="ds-thead">
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Store Name</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id}>
                <td className="ds-mono">#{store.id}</td>
                <td>
                  {store.image ? (
                    <img 
                      src={resolveImageUrl(store.image)} 
                      alt={store.name} 
                      className="w-10 h-10 object-cover rounded-xl border border-border"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center ds-icon-muted"
                      style={{ background: 'var(--ds-surface-2)' }}
                    >
                      <Store size={18} />
                    </div>
                  )}
                </td>
                <td>
                  <div className="ds-h2">{store.name}</div>
                </td>
                <td className="ds-small">
                  {new Date(store.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedStore(store);
                            setShowAdjustModal(true);
                        }}
                        className="ds-btn"
                        data-variant="secondary"
                        title="Adjust Balance"
                    >
                        <PlusCircle size={18} /> Points
                    </button>
                    <button
                        onClick={() => handleShowHistory(store)}
                        className="ds-btn"
                        data-variant="ghost"
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
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="ds-btn"
            data-variant="secondary"
          >
            Prev
          </button>

          <span className="ds-small">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>

          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
            className="ds-btn"
            data-variant="secondary"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Store Modal */}
      {showAddStore && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(24,24,27,0.5)' }}
        >
          <div className="ds-card ds-card-pad w-full max-w-md max-h-[88vh] overflow-y-auto space-y-4">
            <h2 className="ds-h1">Add New Store</h2>

            <div>
              <label className="ds-label">Store Name</label>
              <input
                type="text"
                className="ds-input"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddStore(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStore}
                className="ds-btn"
                data-variant="primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User to Store Modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(24,24,27,0.5)' }}
        >
          <div className="ds-card ds-card-pad w-full max-w-md max-h-[88vh] overflow-y-auto space-y-4">
            <h2 className="ds-h1">Assign User to Store</h2>

            {/* Select User */}
            <div>
              <label className="ds-label">User</label>
              <select
                className="ds-select"
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
              <label className="ds-label">Store</label>
              <select
                className="ds-select"
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
              <label className="ds-label">Role</label>
              <select
                className="ds-select"
                value={assignData.role}
                onChange={(e) =>
                  setAssignData({ ...assignData, role: e.target.value })
                }
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Cancel
              </button>

              <button
                onClick={handleAssign}
                className="ds-btn"
                data-variant="primary"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point History Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
          style={{ background: 'rgba(24,24,27,0.6)' }}
        >
          <div className="ds-card w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div
              className="p-8 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' }}
                >
                  <History size={24} />
                </div>
                <div>
                  <h2 className="ds-h1">Credit History</h2>
                  <p className="ds-small">{selectedStore?.name} (ID: #{selectedStore?.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="ds-btn"
                data-variant="ghost"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div
                    className="animate-spin h-10 w-10 border-4 rounded-full"
                    style={{ borderColor: 'var(--ds-primary)', borderTopColor: 'transparent' }}
                  />
                  <p className="ds-caption animate-pulse">Loading history...</p>
                </div>
              ) : pointHistories.length === 0 ? (
                <div className="ds-empty">
                  <div className="ds-empty-icon">
                    <History size={32} />
                  </div>
                  <p className="ds-small italic">Belum ada riwayat transaksi poin untuk toko ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pointHistories.map((h) => (
                    <div key={h.id} className="p-6 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${h.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {h.amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                          <p className="ds-h2 capitalize">{h.type.replace('_', ' ')}</p>
                          <p className="ds-caption">{h.note}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`ds-num text-lg font-black ${h.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.amount > 0 ? '+' : ''}{h.amount}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 ds-icon-muted mt-1">
                          <Clock size={12} />
                          <span className="ds-caption">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="p-8 flex items-center justify-between"
              style={{ background: 'var(--ds-surface-2)', borderTop: '1px solid var(--ds-border)' }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="ds-btn"
                  data-variant="primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
          style={{ background: 'rgba(24,24,27,0.6)' }}
        >
          <div className="ds-card w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div
              className="p-8 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface-2)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--ds-primary)', color: 'var(--ds-primary-fg)' }}
                >
                  <PlusCircle size={24} />
                </div>
                <div>
                  <h2 className="ds-h1">Adjust Balance</h2>
                  <p className="ds-small">{selectedStore?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="ds-btn"
                data-variant="ghost"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ds-label">Amount (Use negative for deduction)</label>
                  <input
                    type="number"
                    className="ds-input"
                    placeholder="e.g. 100 or -50"
                    value={adjustData.amount}
                    onChange={(e) => setAdjustData({ ...adjustData, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="ds-label">Note / Reason</label>
                  <textarea
                    className="ds-textarea"
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
                  className="ds-btn w-full"
                  data-variant="primary"
                >
                  {adjusting ? <div className="animate-spin h-6 w-6 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Coins size={20} />}
                  {adjusting ? 'Processing...' : 'Submit Adjustment'}
                </button>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="ds-btn w-full"
                  data-variant="secondary"
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
