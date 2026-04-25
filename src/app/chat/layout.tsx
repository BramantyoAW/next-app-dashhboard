import type { Metadata } from 'next'
import DashboardLayout from '@/app/dashboard/layout'

export const metadata: Metadata = {
  title: 'Chat — OmBot',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}