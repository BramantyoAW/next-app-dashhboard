import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from '@/lib/jwt';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get('ombot_token')?.value;
  if (!token) redirect('/login');
  const payload = decodeJwt(token);
  if (!payload) redirect('/login');
  // `.ds-app` memuat remap palet design system (slate/blue → netral+indigo).
  // Sengaja di sini, BUKAN di :root, supaya storefront tenant tidak ikut berubah.
  return <div className="ds-app">{children}</div>;
}
