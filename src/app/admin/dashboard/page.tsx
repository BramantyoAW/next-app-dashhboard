'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminGetTotalUsers, adminGetTotalStores } from "@/graphql/query/admin/getTotals";
import { adminGetAllEmailHistory } from "@/graphql/query/settings/getAllEmailHistory";
import { adminResendEmail } from "@/graphql/mutation/settings/resendEmail";
import { Mail, History, RefreshCw, CheckCircle2, XCircle, User, Store, ShoppingBag } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Administrator");
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalStores, setTotalStores] = useState<number>(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const adminNameLocal = localStorage.getItem("full_name");

    if (!token) {
      router.push("/login");
      return;
    }

    setAdminName(adminNameLocal || "Admin");

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome, {adminName} 👋</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <p className="text-3xl font-bold text-slate-900">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Store className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Stores</p>
            <p className="text-3xl font-bold text-slate-900">{totalStores}</p>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-violet-50 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Orders Today</p>
            <p className="text-3xl font-bold text-slate-900">9999</p>
          </div>
        </div>
      </div>

      <footer className="text-center text-sm text-gray-500 pt-6">
        © 2025 OmBot · Untuk UMKM, untuk Indonesia 🇮🇩
      </footer>
    </div>
  );
}
