'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginService } from '@/graphql/mutation/login'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await loginService(email, password) as { login: { access_token: string } }
      localStorage.setItem('token', res.login.access_token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Login failed:', err)
      alert('Login gagal. Cek kembali email dan password!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
        
        {/* Logo */}
        <div className="text-center">
          <img
            src="/omBot.png"
            alt="Logo"
            className="mx-auto w-20 h-20 object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Login to OmBot</h1>
          <p className="text-sm text-gray-500">Order Management Bot by Bramantyo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
