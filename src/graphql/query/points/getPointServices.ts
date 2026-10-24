import { gqlFetch } from '@/lib/graphqlClient';

export type PointLog = {
  id: string;
  amount: number;
  type: string;
  note: string | null;
  created_at: string;
};

export type AiPointLog = PointLog & {
  feature: string | null;
  store?: { name: string } | null;
};

type Paginated<T> = {
  data: T[];
  pagination: { total: number; current_page: number; total_pages: number };
};

const GET_MY_POINTS = `
  query GetMyPoints($store_id: ID!) {
    getMyPoints(store_id: $store_id)
  }
`;

const GET_POINT_HISTORIES = `
  query GetPointHistories($store_id: ID!, $page: Int, $limit: Int) {
    getPointHistories(store_id: $store_id, page: $page, limit: $limit) {
      data {
        id
        amount
        type
        note
        created_at
      }
      pagination {
        total
        current_page
        total_pages
      }
    }
  }
`;

export function getMyPointsService(token: string, store_id: string): Promise<{ getMyPoints: number }> {
  return gqlFetch<{ getMyPoints: number }>(GET_MY_POINTS, { store_id }, token);
}

export function getPointHistoriesService(
  token: string,
  store_id: string,
  page = 1,
): Promise<{ getPointHistories: Paginated<PointLog> }> {
  return gqlFetch<{ getPointHistories: Paginated<PointLog> }>(
    GET_POINT_HISTORIES,
    { store_id, page, limit: 10 },
    token,
  );
}

/**
 * AI Point — saldo terpisah dari poin order.
 *
 * Pemakaian fitur AI (Design with OmBot AI & OmBot AI Assistance) memotong
 * saldo ini, bukan poin order.
 */
const GET_MY_AI_POINTS = `
  query GetMyAiPoints {
    getMyAiPoints
  }
`;

const GET_AI_POINT_HISTORIES = `
  query GetAiPointHistories($page: Int, $limit: Int) {
    getAiPointHistories(page: $page, limit: $limit) {
      data {
        id
        amount
        type
        feature
        note
        created_at
        store {
          name
        }
      }
      pagination {
        total
        current_page
        total_pages
      }
    }
  }
`;

export function getMyAiPointsService(token: string): Promise<{ getMyAiPoints: number }> {
  return gqlFetch<{ getMyAiPoints: number }>(GET_MY_AI_POINTS, {}, token);
}

export function getAiPointHistoriesService(
  token: string,
  page = 1,
  limit = 10,
): Promise<{ getAiPointHistories: Paginated<AiPointLog> }> {
  return gqlFetch<{ getAiPointHistories: Paginated<AiPointLog> }>(
    GET_AI_POINT_HISTORIES,
    { page, limit },
    token,
  );
}
