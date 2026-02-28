import { gqlFetch } from '@/lib/graphqlClient';

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

export async function getMyPointsService(token: string, store_id: string) {
  return gqlFetch<any>(GET_MY_POINTS, { store_id }, token);
}

export async function getPointHistoriesService(token: string, store_id: string, page = 1) {
  return gqlFetch<any>(GET_POINT_HISTORIES, { store_id, page, limit: 10 }, token);
}
