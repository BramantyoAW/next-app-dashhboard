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
  input: { message: string; context: unknown; history?: { role: string; content: string }[] },
) {
  return gqlFetch<{ aiWebStoreAssistant: AiAssistantResult }>(AI_WEB_STORE_ASSISTANT, { input }, token);
}
