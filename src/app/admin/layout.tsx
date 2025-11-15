'use client';

import React from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6 space-y-6">
        <div
          className="text-2xl font-bold text-blue-600 cursor-pointer"
          onClick={() => router.push('/admin/dashboard')}
        >
          OmBot Admin
        </div>

        <nav className="space-y-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition"
          >
            Manage Users
          </button>

          <button
            onClick={() => router.push('/admin/stores')}
            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition"
          >
            Manage Stores
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition"
          >
            Settings
          </button>
        </nav>

        <div className="pt-6">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
