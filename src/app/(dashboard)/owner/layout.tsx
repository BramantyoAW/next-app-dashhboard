import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from '@/lib/jwt';
import { OwnerShell } from './OwnerShell';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get('ombot_token')?.value;
  if (!token) redirect('/login');
  const payload = decodeJwt(token);
  if (!payload) redirect('/login');
  if (payload.role === 'staff' || payload.store_role === 'staff') redirect('/dashboard');
  const displayName = payload.full_name ?? payload.name ?? payload.username ?? 'Owner';
  return <OwnerShell displayName={displayName}>{children}</OwnerShell>;
}
