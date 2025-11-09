export async function importProducts(token: string, file: File) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL!

  const query = `
    mutation ImportProducts($file: Upload!) {
      importProducts(file: $file) {
        message
        created
        updated
      }
    }
  `

  const operations = JSON.stringify({
    query,
    variables: { file: null }, // <— harus null di sini!
  })

  const map = JSON.stringify({
    "0": ["variables.file"], // <— map ke file index 0
  })

  const formData = new FormData()
  formData.append('operations', operations)
  formData.append('map', map)
  formData.append('0', file, file.name) // <— attach file di key "0"

  console.log('🟢 FormData ready:', file.name)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const json = await res.json()
  if (json.errors) {
    console.error('GraphQL error:', json.errors)
    throw new Error(json.errors[0].message)
  }
  return json.data.importProducts
}
