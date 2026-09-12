import { gqlFetch } from '@/lib/graphqlClient';

/**
 * Admin — kelola AI Point owner.
 *
 * AI Point adalah saldo terpisah dari poin order; dipakai oleh fitur AI
 * (Design with OmBot AI & OmBot AI Assistance).
 */

export type AdminAiPointOwner = {
  id: string;
  nama: string | null;
  username: string | null;
  email: string | null;
  role: string;
  toko: string | null;
  points: number;
  ai_points: number;
  ai_terpakai: number;
};

export type AiPointLog = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  feature: string | null;
  note: string | null;
  created_at: string;
  store?: { name: string } | null;
  user?: { full_name: string | null } | null;
};

const GET_OWNERS = `
  query AdminAiPointOwners($search: String, $page: Int, $limit: Int) {
    adminAiPointOwners(search: $search, page: $page, limit: $limit) {
      data { id nama username email role toko points ai_points ai_terpakai }
      pagination { total current_page total_pages per_page }
    }
  }
`;

const GET_HISTORIES = `
  query AdminAiPointHistories($user_id: ID, $page: Int, $limit: Int) {
    adminAiPointHistories(user_id: $user_id, page: $page, limit: $limit) {
      data {
        id
        user_id
        amount
        type
        feature
        note
        created_at
        store { name }
        user { full_name }
      }
      pagination { total current_page total_pages }
    }
  }
`;

const ADJUST = `
  mutation AdminAdjustAiPoints($input: AdminAdjustAiPointsInput!) {
    adminAdjustAiPoints(input: $input) {
      id
      user_id
      ai_points
      amount
      note
    }
  }
`;

type Paginated<T> = {
  data: T[];
  pagination: { total: number; current_page: number; total_pages: number; per_page: number };
};

export function getAdminAiPointOwnersService(
  token: string,
  search = '',
  page = 1,
  limit = 20,
): Promise<{ adminAiPointOwners: Paginated<AdminAiPointOwner> }> {
  return gqlFetch<{ adminAiPointOwners: Paginated<AdminAiPointOwner> }>(
    GET_OWNERS,
    { search: search || null, page, limit },
    token,
  );
}

export function getAdminAiPointHistoriesService(
  token: string,
  userId: string | null = null,
  page = 1,
  limit = 20,
): Promise<{ adminAiPointHistories: Paginated<AiPointLog> }> {
  return gqlFetch<{ adminAiPointHistories: Paginated<AiPointLog> }>(
    GET_HISTORIES,
    { user_id: userId, page, limit },
    token,
  );
}

export type AdminAiPointResult = {
  id: string;
  user_id: string;
  ai_points: number;
  amount: number;
  note: string | null;
};

/** amount negatif = kurangi saldo. */
export function adminAdjustAiPointsService(
  token: string,
  input: { user_id: string; amount: number; note: string },
): Promise<{ adminAdjustAiPoints: AdminAiPointResult }> {
  return gqlFetch<{ adminAdjustAiPoints: AdminAiPointResult }>(ADJUST, { input }, token);
}
