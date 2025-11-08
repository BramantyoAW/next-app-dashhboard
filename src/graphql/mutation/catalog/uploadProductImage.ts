import { gql } from 'graphql-request'

const UPLOAD_PRODUCT_IMAGE = `
  mutation UploadProductImage($file: Upload!) {
    uploadProductImage(file: $file)
  }
`

export async function uploadProductImage(token: string, file: File): Promise<string> {
  if (!file) throw new Error('No file provided.')
  if (!token) throw new Error('Missing authentication token.')

  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL
  if (!url) throw new Error('NEXT_PUBLIC_GRAPHQL_URL is not defined in .env.local')

  const formData = new FormData()

  // 🧩 GraphQL multipart form spec
  formData.append(
    'operations',
    JSON.stringify({
      query: UPLOAD_PRODUCT_IMAGE,
      variables: { file: null },
    })
  )
  formData.append('map', JSON.stringify({ 0: ['variables.file'] }))
  formData.append('0', file)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)

  return json.data.uploadProductImage as string
}
