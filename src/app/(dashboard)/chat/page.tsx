import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from '@/lib/jwt';

/**
 * Sidebar owner menautkan menu "Messages" ke `/chat`, padahal detail chat
 * hidup di `/chat/[merchantId]` (param itu sebenarnya `store_id`, bukan id
 * percakapan). Tanpa halaman ini `/chat` jatuh ke 404.
 *
 * Cukup redirect ke store aktif dari JWT — halaman detail sendiri yang
 * mengambil daftar pesan per store, jadi tidak ada "percakapan pertama"
 * yang perlu dipilih di sini.
 */
export default async function ChatIndexPage() {
  const token = (await cookies()).get('ombot_token')?.value;
  const storeId = token ? decodeJwt(token)?.store_id : null;
  redirect(storeId ? `/chat/${storeId}` : '/dashboard');
}
