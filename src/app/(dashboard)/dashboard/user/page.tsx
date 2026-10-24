"use client";

import React, { useEffect, useState } from "react";
import { getActiveStoreId } from "@/lib/jwt";
import { getUserByStoreId } from "@/graphql/query/user/getUserByStoreId";
import { createMemberStore } from "@/graphql/mutation/user/createMemberStore";
import { updateMemberStore } from "@/graphql/mutation/user/updateMemberStore";
import { deleteMemberStore } from "@/graphql/mutation/user/deleteMemberStore";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  User, 
  Trash2, 
  Edit3, 
  Shield, 
  Phone,
  Filter,
  XCircle,
  Loader2,
  X
} from "lucide-react";

/** Parse GraphQL validation errors into field-level messages */
function parseFieldErrors(err: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const errors = err?.response?.errors || [];
  for (const e of errors) {
    const validation = e?.extensions?.validation;
    if (validation) {
      for (const [key, messages] of Object.entries(validation)) {
        const fieldName = key.replace(/^input\./, '');
        const msg = Array.isArray(messages) ? (messages as string[])[0] : String(messages);
        fieldErrors[fieldName] = msg;
      }
      return fieldErrors;
    }
  }
  const message = err?.message || err?.response?.errors?.[0]?.message || '';
  if (message) {
    if (message.toLowerCase().includes('email')) {
      fieldErrors['email'] = message;
    } else if (message.toLowerCase().includes('phone') || message.toLowerCase().includes('hp')) {
      fieldErrors['phone'] = message;
    } else if (message.toLowerCase().includes('username')) {
      fieldErrors['username'] = message;
    } else {
      fieldErrors['_general'] = message;
    }
  }
  return fieldErrors;
}

import { Pagination } from "@/components/ui/Pagination";

export default function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Filters State
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formCreate, setFormCreate] = useState({
    username: "",
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  async function loadUsers(p = page, limit = perPage) {
    const token = localStorage.getItem("token");
    const storeId = token ? getActiveStoreId(token) : null;
    if (!token || !storeId) return;

    try {
      const res = await getUserByStoreId(token, storeId, limit, p);
      setUsers(res.getUserByStoreId.data);
      setFilteredUsers(res.getUserByStoreId.data);
      setPagination(res.getUserByStoreId.meta.pagination);
    } catch (err) {
      toast.error("Failed load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(page, perPage);

    const handleStoreRefresh = () => {
      setLoading(true);
      loadUsers(1, perPage);
      setPage(1);
    };

    window.addEventListener('storeRefreshed', handleStoreRefresh);
    return () => window.removeEventListener('storeRefreshed', handleStoreRefresh);
  }, [page, perPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [nameFilter, emailFilter]);

  // Filter Logic
  useEffect(() => {
    let filtered = [...users];

    if (nameFilter.trim()) {
      filtered = filtered.filter(u => 
        (u.full_name || "").toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (emailFilter.trim()) {
      filtered = filtered.filter(u => 
        (u.email || "").toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [nameFilter, emailFilter, users]);

  async function handleCreate() {
    const token = localStorage.getItem("token");
    const storeId = token ? getActiveStoreId(token) : null;
    if (!token || !storeId) return;

    setCreateErrors({});
    setCreateLoading(true);

    try {
      await createMemberStore(token, storeId, "staff", formCreate);
      toast.success("User created successfully!");
      setShowCreateModal(false);
      setFormCreate({ username: "", full_name: "", email: "", phone: "", password: "" });
      loadUsers();
    } catch (err: any) {
      setCreateErrors(parseFieldErrors(err));
      toast.error("Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate() {
    const token = localStorage.getItem("token");
    const storeId = token ? getActiveStoreId(token) : null;
    if (!token || !editUser || !storeId) return;

    setEditErrors({});
    setEditLoading(true);

    try {
      await updateMemberStore(token, editUser.id, storeId, editUser.role, {
        full_name: editUser.full_name,
        email: editUser.email,
        phone: editUser.phone,
        password: editUser.password,
      });
      toast.success("User updated successfully!");
      setShowEditModal(false);
      loadUsers();
    } catch (err: any) {
      setEditErrors(parseFieldErrors(err));
      toast.error("Failed to update user");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    const token = localStorage.getItem("token");
    const storeId = token ? getActiveStoreId(token) : null;
    if (!token || deleteUserId === null || !storeId) return;

    try {
      await deleteMemberStore(token, deleteUserId, storeId);
      toast.success("User removed from store");
      setShowDeleteModal(false);
      loadUsers();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="ds-page-head">
          <div>
            <h1 className="ds-display flex items-center gap-2.5">
              <Users className="ds-accent-text" size={28} />
              User Store Management
            </h1>
            <p className="ds-hint">Control who can access and manage your store data</p>
          </div>
          
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateErrors({});
              setFormCreate({ username: "", full_name: "", email: "", phone: "", password: "" });
            }}
            className="ds-btn"
            data-variant="primary"
          >
            <UserPlus size={16} />
            Add New User
          </button>
        </div>

        {/* Filters Card */}
        <div className="ds-card overflow-hidden">
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
          >
            <div className="flex items-center gap-2 ds-h2">
              <Filter size={16} className="ds-accent-text" />
              Quick Filters
            </div>
            {(nameFilter || emailFilter) && (
              <button 
                onClick={() => { setNameFilter(""); setEmailFilter(""); }}
                className="ds-btn"
                data-variant="ghost"
              >
                <XCircle size={12} className="text-rose-500" /> Clear
              </button>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="ds-label ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors" size={18} />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Filter by name..."
                  className="ds-input"
                  style={{ paddingLeft: 48, paddingRight: 16 }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="ds-label ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted group-focus-within:text-[var(--ds-primary)] transition-colors" size={18} />
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  placeholder="Filter by email..."
                  className="ds-input"
                  style={{ paddingLeft: 48, paddingRight: 16 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ds-table text-left border-collapse">
              <thead className="ds-thead">
                <tr>
                  <th>UserInfo</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ds-empty">
                        <Loader2 className="animate-spin ds-accent-text" size={32} />
                        <p className="ds-caption">Syncing user data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ds-empty">
                        <div className="ds-empty-icon">
                          <Users className="ds-icon-muted" size={20} />
                        </div>
                        <p className="ds-h2">No users matching your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="transition-colors group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center ds-accent-text ds-caption"
                            style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border)' }}
                          >
                            {(u.full_name || u.username || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="ds-h2">{u.full_name}</div>
                            <div className="ds-caption">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="ds-badge" data-tone={u.role === 'owner' ? 'info' : 'neutral'}>
                          <Shield size={10} />
                          {u.role}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 ds-body lowercase">
                            <Mail size={12} className="ds-icon-muted" />
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 ds-caption">
                              <Phone size={12} className="ds-icon-muted" />
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="ds-caption">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditUser({ ...u });
                              setEditErrors({});
                              setShowEditModal(true);
                            }}
                            className="p-2 ds-icon-muted hover:text-[var(--ds-primary)] rounded-xl transition-all"
                            title="Edit User"
                          >
                            <Edit3 size={18} />
                          </button>
                          {u.role !== 'owner' && (
                            <button
                              onClick={() => {
                                setDeleteUserId(u.id);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 ds-icon-muted hover:text-rose-600 rounded-xl transition-all"
                              title="Remove User"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pagination
              currentPage={page}
              totalPages={pagination.total_pages}
              perPage={perPage}
              totalItems={pagination.total}
              onPageChange={setPage}
              onLimitChange={(limit) => {
                setPerPage(limit);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* ➕ CREATE Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          style={{ background: 'rgba(24, 24, 27, 0.6)' }}
        >
          <div className="ds-card w-full max-w-md max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-200" style={{ boxShadow: 'var(--ds-shadow-lg)' }}>
            <div
              className="px-8 py-6 border-b flex justify-between items-center"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <div>
                <h2 className="ds-h1">Create Store Member</h2>
                <p className="ds-caption ds-accent-text mt-1">Invite new staff to your store</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 ds-icon-muted hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-5">
              {[
                { key: 'username', label: 'Unique Username', icon: <User size={18}/>, type: 'text' },
                { key: 'full_name', label: 'Full Display Name', icon: <User size={18}/>, type: 'text' },
                { key: 'email', label: 'Email Address', icon: <Mail size={18}/>, type: 'text' },
                { key: 'phone', label: 'Phone Number', icon: <Phone size={18}/>, type: 'text' },
                { key: 'password', label: 'Password (optional)', icon: <Shield size={18}/>, type: 'password' },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="ds-label ml-1">{f.label}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted">
                      {f.icon}
                    </div>
                    <input
                      type={f.type}
                      placeholder={f.key === 'password' ? 'Leave blank to auto-generate' : ''}
                      className="ds-input"
                  style={{ paddingLeft: 48, paddingRight: 16 }}
                      aria-invalid={createErrors[f.key] ? 'true' : undefined}
                      value={(formCreate as any)[f.key]}
                      onChange={(e) => setFormCreate({...formCreate, [f.key]: e.target.value})}
                    />
                  </div>
                  {createErrors[f.key] && (
                    <p className="ds-error ml-1">{createErrors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>

            <div
              className="px-8 py-6 border-t flex justify-end gap-3"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="ds-btn"
                data-variant="primary"
              >
                {createLoading ? 'Processing...' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT Modal */}
      {showEditModal && editUser && (
        <div
          className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          style={{ background: 'rgba(24, 24, 27, 0.6)' }}
        >
          <div className="ds-card w-full max-w-md max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-200" style={{ boxShadow: 'var(--ds-shadow-lg)' }}>
            <div
              className="px-8 py-6 border-b flex justify-between items-center"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <div>
                <h2 className="ds-h1">Edit Member Profile</h2>
                <p className="ds-caption ds-accent-text mt-1">Updating {editUser.username}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="ds-icon-muted hover:text-rose-500"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-5">
              {[
                { key: 'full_name', label: 'Full Name', icon: <User size={18}/> },
                { key: 'email', label: 'Email Address', icon: <Mail size={18}/> },
                { key: 'phone', label: 'Phone Number', icon: <Phone size={18}/> },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="ds-label ml-1">{f.label}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted">
                      {f.icon}
                    </div>
                    <input
                      type="text"
                      className="ds-input"
                  style={{ paddingLeft: 48, paddingRight: 16 }}
                      value={editUser[f.key] ?? ""}
                      onChange={(e) => setEditUser({ ...editUser, [f.key]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              
              <div className="space-y-1.5">
                <label className="ds-label ml-1">New Password (optional)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 ds-icon-muted">
                    <Shield size={18}/>
                  </div>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    className="ds-input"
                  style={{ paddingLeft: 48, paddingRight: 16 }}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div
              className="px-8 py-6 border-t flex justify-end gap-3"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <button 
                onClick={() => setShowEditModal(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Close
              </button>
              <button
                onClick={handleUpdate}
                disabled={editLoading}
                className="ds-btn"
                data-variant="primary"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          style={{ background: 'rgba(24, 24, 27, 0.6)' }}
        >
          <div className="ds-card w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" style={{ boxShadow: 'var(--ds-shadow-lg)' }}>
            <div className="p-8 text-center space-y-4">
              <div
                className="ds-empty-icon mx-auto"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: '#fef2f2',
                  color: 'var(--ds-danger)',
                }}
              >
                <Trash2 size={32} />
              </div>
              <div>
                <h2 className="ds-h1">Remove Member?</h2>
                <p className="ds-small mt-2">
                  This user will lose all access to this store. This action cannot be undone.
                </p>
              </div>
            </div>
            <div
              className="p-8 border-t grid grid-cols-2 gap-3"
              style={{ background: 'var(--ds-surface-2)', borderColor: 'var(--ds-border)' }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="ds-btn"
                data-variant="danger"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
