import 'server-only';
import { gqlFetch } from '@/lib/graphqlClient';

/**
 * Server-only re-export. The file-upload branch in the shared `gqlFetch`
 * is dead code on the server (File/Blob only exist in the browser),
 * so this is a safe alias.
 */
export async function gqlFetchServer<T>(
  args: { query: string; variables?: Record<string, any>; token?: string },
): Promise<T | null> {
  try {
    return await gqlFetch<T>(args.query, args.variables ?? {}, args.token);
  } catch {
    return null;
  }
}
