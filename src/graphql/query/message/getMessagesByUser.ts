import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

// ─────────────────────────────────────────────
// Get messages by user_id + store_id (AI memory)
// ─────────────────────────────────────────────
export const GET_MESSAGES_BY_USER = gql`
  query GetMessagesByUser($user_id: ID!, $store_id: ID!, $channel: String, $page: Int, $limit: Int) {
    getMessagesByUser(user_id: $user_id, store_id: $store_id, channel: $channel, page: $page, limit: $limit) {
      data {
        id
        sender_id
        channel
        direction
        body
        type
        status
        username
        created_at
        updated_at
      }
      pagination {
        total
        current_page
        per_page
        total_pages
      }
    }
  }
`

// ─────────────────────────────────────────────
// Get conversation history as plain text (for n8n AI context)
// ─────────────────────────────────────────────
export const GET_MESSAGES_BY_USER_AS_TEXT = gql`
  query GetMessagesByUserAsText($user_id: ID!, $store_id: ID!, $channel: String, $limit: Int) {
    getMessagesByUserAsText(user_id: $user_id, store_id: $store_id, channel: $channel, limit: $limit)
  }
`

export async function getMessagesByUser(
  token: string,
  user_id: number,
  store_id: number,
  channel?: string,
  page: number = 1,
  limit: number = 50,
) {
  return graphqlClient
    .setHeaders({ Authorization: `Bearer ${token}` })
    .request(GET_MESSAGES_BY_USER, { user_id, store_id, channel, page, limit })
}

export async function getMessagesByUserAsText(
  token: string,
  user_id: number,
  store_id: number,
  channel?: string,
  limit: number = 20,
): Promise<string> {
  const res: any = await graphqlClient
    .setHeaders({ Authorization: `Bearer ${token}` })
    .request(GET_MESSAGES_BY_USER_AS_TEXT, { user_id, store_id, channel, limit })
  return res.getMessagesByUserAsText as string
}
