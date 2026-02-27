import { GraphQLClient } from 'graphql-request'

const endpoint = (process.env.NEXT_PUBLIC_GRAPHQL_URL || "").trim();

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_GRAPHQL_URL is not set");
}

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {},
})
