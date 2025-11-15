'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminGetTotalUsers, adminGetTotalStores } from "@/graphql/query/admin/getTotals";

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Administrator");
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalStores, setTotalStores] = useState<number>(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    const loadTotals = async () => {
      try {
        const usersRes = await adminGetTotalUsers(token);
        const storesRes = await adminGetTotalStores(token);

        setTotalUsers(usersRes.getAllUsers.meta.pagination.total);
        setTotalStores(storesRes.getAllStores.pagination.total);

        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    loadTotals();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome, {adminName} 👋</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-xl p-6 border">
          <p className="text-gray-500">Total Users</p>
          <p className="text-3xl font-bold mt-2">{totalUsers}</p>
        </div>

        <div className="bg-white shadow rounded-xl p-6 border">
          <p className="text-gray-500">Total Stores</p>
          <p className="text-3xl font-bold mt-2">{totalStores}</p>
        </div>

        <div className="bg-white shadow rounded-xl p-6 border">
          <p className="text-gray-500">Active Orders Today</p>
          <p className="text-3xl font-bold mt-2">9999</p>
        </div>
      </div>

      <footer className="text-center text-sm text-gray-500 pt-6">
        © 2025 OmBot · Untuk UMKM, untuk Indonesia 🇮🇩
      </footer>
    </div>
  );
}
