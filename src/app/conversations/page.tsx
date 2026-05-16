import { redirect } from 'next/navigation'

// Conversations page — moved to /dashboard/user/message
export default function ConversationsRedirect() {
  redirect('/dashboard/user/message')
}