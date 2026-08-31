import { gqlFetch } from '@/lib/graphqlClient';

export type AiHistoryMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
};

export const AI_CHAT_HISTORY = `
  query AiChatHistory($web_store_id: ID!) {
    aiChatHistory(web_store_id: $web_store_id) {
      id web_store_id title
      messages { id conversation_id role content created_at }
    }
  }
`;

export function getAiChatHistory(token: string, webStoreId: string) {
  return gqlFetch<{ aiChatHistory: { id: string; web_store_id: string; title?: string | null; messages: AiHistoryMessage[] } | null }>(
    AI_CHAT_HISTORY,
    { web_store_id: webStoreId },
    token,
  );
}
