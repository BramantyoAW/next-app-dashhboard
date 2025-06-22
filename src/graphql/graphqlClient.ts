import { GraphQLClient } from 'graphql-request'

const endpoint = 'http://127.0.0.1:8000/graphql'

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
})
