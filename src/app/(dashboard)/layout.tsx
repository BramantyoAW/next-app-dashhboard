import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from '@/lib/jwt';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get('ombot_token')?.value;
  if (!token) redirect('/login');
  const payload = decodeJwt(token);
  if (!payload) redirect('/login');
  return <>{children}</>;
}
