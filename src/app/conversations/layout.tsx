import type { Metadata } from 'next'
import DashboardLayout from '@/app/dashboard/layout'

export const metadata: Metadata = {
  title: 'Conversations — OmBot',
}

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}