'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetAllUsersService } from "@/graphql/query/admin/getAllUsers";
import { adminCreateUserService } from "@/graphql/mutation/admin/createUser";
import { adminUpdateUserStatusService } from "@/graphql/mutation/admin/updateUserStatus";

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const limit = 10;

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    store_name: "",
  });

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await adminGetAllUsersService(token, limit, page);

      setUsers(res.getAllUsers.data);
      setPagination(res.getAllUsers.meta.pagination);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed to load users.");
    }
  };

  const handleUpdateStatus = async (id: string | number, status: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await adminUpdateUserStatusService(token, id, status);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleCreateUser = async () => {
    // ... same logic
  };

  useEffect(() => {
    loadUsers();
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
        <h1 className="ds-display">Manage Users</h1>

        <button
          onClick={() => setShowModal(true)}
          className="ds-btn"
          data-variant="primary"
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <div className="ds-card ds-card-pad">
        <div className="ds-table-wrap">
        <table className="ds-table">
          <thead className="ds-thead">
            <tr>
              <th>ID</th>
              <th>User & Toko</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={idx}>
                <td className="ds-mono">{u.id}</td>
                <td>
                  <div className="ds-h2">{u.full_name} (@{u.username})</div>
                  <div className="ds-caption ds-accent-text">{u.stores?.[0]?.name || '-'}</div>
                </td>
                <td>{u.email}</td>
                <td className="uppercase">{u.role}</td>
                <td>
                   {u.status === 0 ? (
                    <span className="ds-badge" data-tone="warn">Pending</span>
                  ) : u.status === 1 ? (
                    <span className="ds-badge" data-tone="ok">Active</span>
                  ) : (
                    <span className="ds-badge" data-tone="bad">Suspended</span>
                  )}
                </td>
                <td>
                   <div className="flex space-x-2">
                    {u.status !== 1 && (
                      <button onClick={() => handleUpdateStatus(u.id, 1)} className="ds-btn" data-variant="primary">Activate</button>
                    )}
                    {u.status !== 2 && (
                      <button
                        onClick={() => handleUpdateStatus(u.id, 2)}
                        className="ds-btn"
                        data-variant="danger"
                      >Suspend</button>
                    )}
                  </div>
                </td>
                <td>
                  {new Date(u.created_at).toLocaleString()}
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

      {/* Modal Add User */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(24,24,27,0.5)' }}
        >
          <div className="ds-card ds-card-pad w-full max-w-md max-h-[88vh] overflow-y-auto space-y-4">

            <h2 className="ds-h1 mb-4">Add New User</h2>

            <div className="space-y-3">
              {/** All fields based on GraphQL input */}
              {["username", "full_name", "email", "phone", "password", "store_name"].map((field) => (
                <div key={field}>
                  <label className="ds-label capitalize">{field.replace("_", " ")}</label>
                  <input
                    type={field === "password" ? "password" : "text"}
                    name={field}
                    value={(formData as any)[field]}
                    onChange={handleChange}
                    className="ds-input"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="ds-btn"
                data-variant="secondary"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateUser}
                className="ds-btn"
                data-variant="primary"
              >
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
