import { graphqlClient } from "@/graphql/graphqlClient"

export async function importInventoryQuantity(token: string, file: File) {
  const formData = new FormData()
  formData.append("operations", JSON.stringify({
    query: `
      mutation ImportInventoryQuantity($file: Upload!) {
        importInventoryQuantity(file: $file) {
          message
          total_rows
          updated_count
          failed_count
        }
      }
    `,
    variables: { file: null }
  }))
  formData.append("map", JSON.stringify({ "0": ["variables.file"] }))
  formData.append("0", file)

  const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data.importInventoryQuantity
}
