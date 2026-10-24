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
        <div
          className="animate-spin rounded-full h-12 w-12"
          style={{ borderTop: '2px solid var(--ds-primary)', borderBottom: '2px solid var(--ds-primary)' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="ds-display">Welcome, {adminName} 👋</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="ds-card ds-card-pad flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-primary)' }}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="ds-small">Total Users</p>
            <p className="ds-num ds-h1">{totalUsers}</p>
          </div>
        </div>

        <div className="ds-card ds-card-pad flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: '#ecfdf5', color: '#15803d' }}>
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="ds-small">Total Stores</p>
            <p className="ds-num ds-h1">{totalStores}</p>
          </div>
        </div>

        <div className="ds-card ds-card-pad flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="ds-small">Active Orders Today</p>
            <p className="ds-num ds-h1">9999</p>
          </div>
        </div>
      </div>

      <footer className="ds-caption text-center pt-6">
        © 2025 OmBot · Untuk UMKM, untuk Indonesia 🇮🇩
      </footer>
    </div>
  );
}
