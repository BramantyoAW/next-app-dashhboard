// app/(dashboard)/layout.tsx
import Link from 'next/link'
import React from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      
      {/* Header */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Toyeb Apps</h1>
        <div className="space-x-4">
          <span className="text-gray-700">Halo, Admin</span>
          <Link href="/logout" className="text-red-500 hover:underline">Logout</Link>
        </div>
      </header>

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md p-6 space-y-4">
          <nav className="flex flex-col space-y-2">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
            <Link href="/profile" className="text-gray-700 hover:text-blue-600">Profile</Link>
            <Link href="/settings" className="text-gray-700 hover:text-blue-600">Settings</Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

