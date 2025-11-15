'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetAllUsersService } from "@/graphql/query/admin/getAllUsers";
import { adminCreateUserService } from "@/graphql/mutation/admin/createUser";

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

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await adminCreateUserService(token, formData);

      alert("User created successfully!");
      setShowModal(false);
      setFormData({
        username: "",
        full_name: "",
        email: "",
        phone: "",
        password: "",
        store_name: "",
      });

      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to create user");
    }
  };

  useEffect(() => {
    loadUsers();
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
        <h1 className="text-3xl font-bold">Manage Users</h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Username</th>
              <th className="p-3 border-b">Full Name</th>
              <th className="p-3 border-b">Email</th>
              <th className="p-3 border-b">Role</th>
              <th className="p-3 border-b">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-3 border-b">{u.id}</td>
                <td className="p-3 border-b">{u.username}</td>
                <td className="p-3 border-b">{u.full_name}</td>
                <td className="p-3 border-b">{u.email}</td>
                <td className="p-3 border-b">{u.role}</td>
                <td className="p-3 border-b">
                  {new Date(u.created_at).toLocaleString()}
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

      {/* Modal Add User */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md space-y-4">

            <h2 className="text-xl font-bold mb-4">Add New User</h2>

            <div className="space-y-3">
              {/** All fields based on GraphQL input */}
              {["username", "full_name", "email", "phone", "password", "store_name"].map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium capitalize">{field.replace("_", " ")}</label>
                  <input
                    type={field === "password" ? "password" : "text"}
                    name={field}
                    value={(formData as any)[field]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
