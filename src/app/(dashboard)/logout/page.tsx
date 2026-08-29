'use client'

import React, { useEffect } from 'react'
import { logoutServices } from '@/graphql/mutation/logout'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        console.warn('No token found in localStorage')
        router.push('/login')
        return
      }

      try {
        const res = await logoutServices(token)
        console.log('Logout success:', res)

        localStorage.removeItem('token')

        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } catch (err) {
        console.error('Logout failed:', err)

        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Logging out...</h2>
        <p>You are being signed out of your account.</p>
      </div>
    </div>
  )
}
