"use client";

import React, { useEffect, useState } from "react";
import { extractStoreId } from "@/lib/jwt";
import { getUserByStoreId } from "@/graphql/query/user/getUserByStoreId";
import { createMemberStore } from "@/graphql/mutation/user/createMemberStore";
import { updateMemberStore } from "@/graphql/mutation/user/updateMemberStore";
import { deleteMemberStore } from "@/graphql/mutation/user/deleteMemberStore";
import { toast } from "sonner";

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
    password: "",
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

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

    try {
      await createMemberStore(token, storeId, "staff", formCreate);
      toast.success("User created!");

      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed create");
    }
  }

  async function handleUpdate() {
    if (!token || !editUser || !storeId) return;

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
    } catch (err) {
      console.error(err);
      toast.error("Failed update");
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User Store</h1>
        <button
          onClick={() => setShowCreateModal(true)}
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center">
          <div
            className="bg-white p-6 rounded shadow-lg w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">Create User</h2>

            {["username", "full_name", "email", "phone", "password"].map(
              (field) => (
                <input
                  key={field}
                  className="w-full p-2 border rounded"
                  placeholder={field.replace("_", " ").toUpperCase()}
                  type={field === "password" ? "password" : "text"}
                  value={(formCreate as any)[field]}
                  onChange={(e) =>
                    setFormCreate({
                      ...formCreate,
                      [field]: e.target.value,
                    })
                  }
                />
              )
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center">
          <div
            className="bg-white p-6 rounded shadow-lg w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg">Edit User</h2>

            {["full_name", "email", "phone", "password"].map((field) => (
              <input
                key={field}
                className="w-full p-2 border rounded"
                placeholder={field.replace("_", " ").toUpperCase()}
                type={field === "password" ? "password" : "text"}
                value={editUser[field] ?? ""}
                onChange={(e) =>
                  setEditUser({ ...editUser, [field]: e.target.value })
                }
              />
            ))}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-2 rounded bg-gray-200"
              >
                Close
              </button>

              <button
                onClick={handleUpdate}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center">
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
