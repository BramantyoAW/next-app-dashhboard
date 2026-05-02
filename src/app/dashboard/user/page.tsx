"use client";

import React, { useEffect, useState } from "react";
import { extractStoreId } from "@/lib/jwt";
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
    const storeId = token ? extractStoreId(token) : null;
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
    const storeId = token ? extractStoreId(token) : null;
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
    const storeId = token ? extractStoreId(token) : null;
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
    const storeId = token ? extractStoreId(token) : null;
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
    <div className="p-8 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="text-indigo-600" size={28} />
              User Store Management
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Control who can access and manage your store data</p>
          </div>
          
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateErrors({});
              setFormCreate({ username: "", full_name: "", email: "", phone: "", password: "" });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <UserPlus size={16} />
            Add New User
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Filter size={16} className="text-indigo-600" />
              Quick Filters
            </div>
            {(nameFilter || emailFilter) && (
              <button 
                onClick={() => { setNameFilter(""); setEmailFilter(""); }}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <XCircle size={12} /> Clear
              </button>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  placeholder="Filter by email..."
                  className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black tracking-widest text-slate-500">
                  <th className="px-6 py-5">UserInfo</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Contact</th>
                  <th className="px-6 py-5">Joined Date</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-slate-400 font-bold tracking-tight">Syncing user data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Users className="text-slate-200" size={32} />
                        </div>
                        <p className="text-slate-400 font-bold tracking-tight text-lg">No users matching your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                            {(u.full_name || u.username || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.full_name}</div>
                            <div className="text-xs text-slate-400 font-medium">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          u.role === 'owner' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <Shield size={10} />
                          {u.role}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium lowercase">
                            <Mail size={12} className="text-slate-300" />
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                              <Phone size={12} className="text-slate-300" />
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-medium">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditUser({ ...u });
                              setEditErrors({});
                              setShowEditModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
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
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Store Member</h2>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Invite new staff to your store</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      {f.icon}
                    </div>
                    <input
                      type={f.type}
                      placeholder={f.key === 'password' ? 'Leave blank to auto-generate' : ''}
                      className={`w-full h-12 bg-slate-50 border ${createErrors[f.key] ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium`}
                      value={(formCreate as any)[f.key]}
                      onChange={(e) => setFormCreate({...formCreate, [f.key]: e.target.value})}
                    />
                  </div>
                  {createErrors[f.key] && (
                    <p className="text-[10px] text-rose-500 font-bold ml-1">{createErrors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
              >
                {createLoading ? 'Processing...' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Member Profile</h2>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Updating {editUser.username}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-300 hover:text-rose-500"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-5">
              {[
                { key: 'full_name', label: 'Full Name', icon: <User size={18}/> },
                { key: 'email', label: 'Email Address', icon: <Mail size={18}/> },
                { key: 'phone', label: 'Phone Number', icon: <Phone size={18}/> },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      {f.icon}
                    </div>
                    <input
                      type="text"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                      value={editUser[f.key] ?? ""}
                      onChange={(e) => setEditUser({ ...editUser, [f.key]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password (optional)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <Shield size={18}/>
                  </div>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Close
              </button>
              <button
                onClick={handleUpdate}
                disabled={editLoading}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <Trash2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Remove Member?</h2>
                <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                  This user will lose all access to this store. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="h-12 bg-rose-600 text-white rounded-2xl text-sm font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95"
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
