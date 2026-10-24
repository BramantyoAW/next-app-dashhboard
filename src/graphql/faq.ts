import { gqlFetch } from '@/lib/graphqlClient';

/**
 * FAQ global (diatur administrator) — dipakai OmBot AI Assistance
 * sebagai pengetahuan di luar data toko.
 */

const FAQS = `
query {
  faqs {
    id
    question
    answer
    category
    is_active
    sort_order
    created_at
    updated_at
  }
}
`;

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type FaqsResponse = { faqs: Faq[] };

export async function getFaqsService(token: string) {
  return gqlFetch<FaqsResponse>(FAQS, {}, token);
}

const UPSERT_FAQ = `
mutation UpsertFaq($input: UpsertFaqInput!) {
  upsertFaq(input: $input) {
    id question answer category is_active sort_order
  }
}
`;

export async function upsertFaqService(
  token: string,
  input: {
    id?: string | null;
    question?: string;
    answer?: string;
    category?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
) {
  return gqlFetch<{ upsertFaq: Faq }>(UPSERT_FAQ, { input }, token);
}

const DELETE_FAQ = `
mutation DeleteFaq($id: ID!) {
  deleteFaq(id: $id)
}
`;

export async function deleteFaqService(token: string, id: string) {
  return gqlFetch<{ deleteFaq: boolean }>(DELETE_FAQ, { id }, token);
}
