import { graphqlClient } from '../graphqlClient'
import { gql } from 'graphql-request'

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      access_token
      user {
        id
        full_name
        email
      }
    }
  }
`

export async function loginService(email: string, password: string) {
  return await graphqlClient.request(LOGIN_MUTATION, { email, password } )
}
