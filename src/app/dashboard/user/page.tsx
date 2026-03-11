"use client";

import React, { useEffect, useState } from "react";
import { extractStoreId } from "@/lib/jwt";
import { getUserByStoreId } from "@/graphql/query/user/getUserByStoreId";
import { createMemberStore } from "@/graphql/mutation/user/createMemberStore";
import { updateMemberStore } from "@/graphql/mutation/user/updateMemberStore";
import { deleteMemberStore } from "@/graphql/mutation/user/deleteMemberStore";
import { toast } from "sonner";

/** Parse GraphQL validation errors into field-level messages */
function parseFieldErrors(err: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // graphql-request stores errors in err.response.errors
  const errors = err?.response?.errors || [];
  for (const e of errors) {
    const validation = e?.extensions?.validation;
    if (validation) {
      // Laravel GraphQL validation format: { "input.email": ["The email..."], ... }
      for (const [key, messages] of Object.entries(validation)) {
        // Strip "input." prefix if present
        const fieldName = key.replace(/^input\./, '');
        const msg = Array.isArray(messages) ? (messages as string[])[0] : String(messages);
        fieldErrors[fieldName] = msg;
      }
      return fieldErrors;
    }
  }

  // Fallback: try to parse from error message
  const message = err?.message || err?.response?.errors?.[0]?.message || '';
  if (message) {
    // Check for common patterns
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

export default function UserPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const storeId = token ? extractStoreId(token) : null;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formCreate, setFormCreate] = useState({
    username: "",
    full_name: "",
    email: "",
    phone: "",
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

  async function loadUsers(page = 1) {
    if (!token || !storeId) return;

    try {
      const res = await getUserByStoreId(token, storeId, 10, page);
      setUsers(res.getUserByStoreId.data);
      setPagination(res.getUserByStoreId.meta.pagination);
    } catch (err) {
      toast.error("Failed load user");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!token || !storeId) return;
    setCreateErrors({});
    setCreateLoading(true);

    try {
      await createMemberStore(token, storeId, "staff", formCreate);
      toast.success("User created!");

      setShowCreateModal(false);
      setFormCreate({ username: "", full_name: "", email: "", phone: "" });
      loadUsers();
    } catch (err: any) {
      console.error(err);
      const fieldErrors = parseFieldErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setCreateErrors(fieldErrors);
        if (fieldErrors['_general']) {
          toast.error(fieldErrors['_general']);
        }
      } else {
        toast.error("Gagal membuat user. Periksa kembali data yang diinput.");
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate() {
    if (!token || !editUser || !storeId) return;
    setEditErrors({});
    setEditLoading(true);

    try {
      await updateMemberStore(
        token,
        editUser.id,
        storeId,
        'staff',
        {
          full_name: editUser.full_name,
          email: editUser.email,
          phone: editUser.phone,
          password: editUser.password,
        }
      );

      toast.success("User updated!");
      setShowEditModal(false);
      loadUsers();
    } catch (err: any) {
      console.error(err);
      const fieldErrors = parseFieldErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors);
        if (fieldErrors['_general']) {
          toast.error(fieldErrors['_general']);
        }
      } else {
        toast.error("Gagal mengupdate user. Periksa kembali data yang diinput.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!token || deleteUserId === null || !storeId) return;

    try {
      await deleteMemberStore(token, deleteUserId, storeId);

      toast.success("User deleted!");
      setShowDeleteModal(false);
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed delete");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 animate-pulse">Loading user...</div>
    );
  }

  const createFields = [
    { key: "username", label: "Username", type: "text" },
    { key: "full_name", label: "Nama Lengkap", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Nomor HP", type: "text" },
  ];

  const editFields = [
    { key: "full_name", label: "Nama Lengkap", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Nomor HP", type: "text" },
    { key: "password", label: "Password (opsional)", type: "password" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User Store</h1>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateErrors({});
            setFormCreate({ username: "", full_name: "", email: "", phone: "" });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Create User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded border shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">Full Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr className="border-b" key={u.id}>
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.full_name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.created_at}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="px-3 py-1 bg-gray-200 rounded text-xs"
                    onClick={() => {
                      setEditUser({ ...u });
                      setEditErrors({});
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                    onClick={() => {
                      setDeleteUserId(u.id);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div
            className="bg-white p-6 rounded shadow-lg w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">Create User</h2>

            {createErrors['_general'] && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded text-sm">
                {createErrors['_general']}
              </div>
            )}

            {createFields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label}
                </label>
                <input
                  className={`w-full p-2 border rounded transition-colors ${
                    createErrors[key]
                      ? 'border-red-400 bg-red-50 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder={label}
                  type={type}
                  value={(formCreate as any)[key]}
                  onChange={(e) =>
                    setFormCreate({
                      ...formCreate,
                      [key]: e.target.value,
                    })
                  }
                />
                {createErrors[key] && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    {createErrors[key]}
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 rounded bg-gray-200"
                disabled={createLoading}
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={createLoading}
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div
            className="bg-white p-6 rounded shadow-lg w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">Edit User</h2>

            {editErrors['_general'] && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded text-sm">
                {editErrors['_general']}
              </div>
            )}

            {editFields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label}
                </label>
                <input
                  className={`w-full p-2 border rounded transition-colors ${
                    editErrors[key]
                      ? 'border-red-400 bg-red-50 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder={label}
                  type={type}
                  value={editUser[key] ?? ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, [key]: e.target.value })
                  }
                />
                {editErrors[key] && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    {editErrors[key]}
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-2 rounded bg-gray-200"
                disabled={editLoading}
              >
                Close
              </button>

              <button
                onClick={handleUpdate}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div
            className="bg-white p-6 rounded shadow-lg w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">Delete User</h2>
            <p className="text-sm text-gray-600">
              Are you sure want to delete this user?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-3 py-2 rounded bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
