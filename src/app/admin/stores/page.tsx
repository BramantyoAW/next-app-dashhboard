'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminGetAllStoresService } from "@/graphql/query/admin/getAllStores";
import { adminCreateStoreService } from "@/graphql/mutation/admin/createStore";
import { adminAssignUserToStoreService } from "@/graphql/mutation/admin/assignUserToStore";
import { adminGetAllUsersService } from "@/graphql/query/admin/getAllUsers";

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

  const loadStores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      const res = await adminGetAllStoresService(token, limit, page);
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
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Name</th>
              <th className="p-3 border-b">Created</th>
              <th className="p-3 border-b">Updated</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="p-3 border-b">{store.id}</td>
                <td className="p-3 border-b">{store.name}</td>
                <td className="p-3 border-b">
                  {new Date(store.created_at).toLocaleString()}
                </td>
                <td className="p-3 border-b">
                  {new Date(store.updated_at).toLocaleString()}
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

    </div>
  );
}
