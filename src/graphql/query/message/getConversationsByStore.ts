import { graphqlClient } from '@/graphql/graphqlClient'
import { gql } from 'graphql-request'

// ─────────────────────────────────────────────
// Get list of conversation threads per store
// ─────────────────────────────────────────────
export const GET_CONVERSATIONS_BY_STORE = gql`
  query GetConversationsByStore($store_id: ID!) {
    getConversationsByStore(store_id: $store_id) {
      sender_id
      channel
      username
      store_id
      last_message
      last_message_at
      total_messages
      unread_count
    }
  }
`

export async function getConversationsByStore(token: string, store_id: number) {
  return graphqlClient
    .setHeaders({ Authorization: `Bearer ${token}` })
    .request(GET_CONVERSATIONS_BY_STORE, { store_id })
}

// ─────────────────────────────────────────────
// Get messages for a specific conversation
// ─────────────────────────────────────────────
export const GET_MESSAGES_BY_CONVERSATION = gql`
  query GetMessagesByConversation(
    $store_id: ID!
    $sender_id: String!
    $channel: String!
    $page: Int
    $limit: Int
  ) {
    getMessagesByConversation(
      store_id: $store_id
      sender_id: $sender_id
      channel: $channel
      page: $page
      limit: $limit
    ) {
      data {
        id
        sender_id
        channel
        direction
        body
        type
        status
        username
        metadata
        image
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

export async function getMessagesByConversation(
  token: string,
  store_id: number,
  sender_id: string,
  channel: string,
  page: number = 1,
  limit: number = 50,
) {
  return graphqlClient
    .setHeaders({ Authorization: `Bearer ${token}` })
    .request(GET_MESSAGES_BY_CONVERSATION, {
      store_id,
      sender_id,
      channel,
      page,
      limit,
    })
}
