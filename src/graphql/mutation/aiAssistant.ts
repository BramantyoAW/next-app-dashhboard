import { gqlFetch } from '@/lib/graphqlClient';

export type AiChangeSuggestion = {
  field: string;
  from: unknown;
  to: unknown;
  description: string;
};

export type AiAssistantResult = {
  reply: string;
  language: string;
  needs_clarification: boolean;
  clarification_question?: string | null;
  changes: AiChangeSuggestion[];
  warnings: string[];
};

const AI_WEB_STORE_ASSISTANT = `
  mutation AiWebStoreAssistant($input: AiWebStoreAssistantInput!) {
    aiWebStoreAssistant(input: $input) {
      reply language needs_clarification clarification_question
      changes { field from to description }
      warnings
    }
  }
`;

export function askWebStoreAssistant(
  token: string,
  input: { web_store_id?: string; scope?: string; message: string; context?: unknown; history?: { role: string; content: string }[] },
) {
  return gqlFetch<{ aiWebStoreAssistant: AiAssistantResult }>(AI_WEB_STORE_ASSISTANT, { input }, token);
}

const AI_SEND_MESSAGE = `mutation AiSendMessage($input: AiChatSendInput!) { aiSendMessage(input: $input) { id web_store_id messages { id conversation_id role content created_at } } }`;
const AI_CLEAR_HISTORY = `mutation AiClearHistory($web_store_id: ID!) { aiClearHistory(web_store_id: $web_store_id) }`;

export function persistAiMessage(token: string, webStoreId: string, message: string, reply?: string) {
  return gqlFetch<{ aiSendMessage: { id: string } }>(AI_SEND_MESSAGE, {
    input: { web_store_id: webStoreId, message, reply: reply ?? null },
  }, token);
}

export function clearAiHistory(token: string, webStoreId: string) {
  return gqlFetch<{ aiClearHistory: boolean }>(AI_CLEAR_HISTORY, { web_store_id: webStoreId }, token);
}
