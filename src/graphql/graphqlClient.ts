import { GraphQLClient } from 'graphql-request'

const rawEndpoint = (process.env.NEXT_PUBLIC_GRAPHQL_URL || "").trim();

if (!rawEndpoint) {
  throw new Error("NEXT_PUBLIC_GRAPHQL_URL is not set");
}

// graphql-request requires an absolute URL.
// If the endpoint is relative (e.g. /api/graphql), prepend the current origin.
const endpoint = rawEndpoint.startsWith('http')
  ? rawEndpoint
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + rawEndpoint;

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {},
})
