import { gql } from 'graphql-request'
import { graphqlClient } from '../graphqlClient'

const LOGOUT_MUTATION = gql`
  mutation Logout($token: String!) {
    logout(token: $token) {
      status
      message
    }
  }
`

export const logoutServices = async (token: string) => {
  return graphqlClient.request(LOGOUT_MUTATION, { token })
}
