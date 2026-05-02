import { graphqlClient } from '../graphqlClient'
import { gql } from 'graphql-request'

const PROFILE_QUERY = gql`
  query {
    me {
      user {
        full_name
        store_id
        store_name
        store_points
        store_image
        store_phone
        store_address
        store_role
      }
      expires_in
      expired_status
    }
  }
`

export async function getProfile(token: string) {
  console.log('[DEBUG] Token:', token);
  if (!token) {
    throw new Error('Token is undefined/null');
  }

  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  return await graphqlClient.request(PROFILE_QUERY);
}
