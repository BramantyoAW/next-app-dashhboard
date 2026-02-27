// No imports needed for native fetch and FormData usage

export const registerService = async (input: any) => {
  const query = `
    mutation RegisterWithStore($input: RegisterWithStoreInput!) {
      registerWithStore(input: $input) {
        access_token
        token_type
        expires_in
        user {
          id
          username
          full_name
          email
          status
        }
      }
    }
  `;

  // Handle multipart upload manually to ensure spec compliance
  const formData = new FormData();
  
  // 1. operations
  const operations = {
    query,
    variables: {
      input: {
        ...input,
        image: null // Set to null in JSON, will be mapped to the file part
      }
    }
  };
  formData.append('operations', JSON.stringify(operations));

  // 2. map
  if (input.image instanceof File) {
    formData.append('map', JSON.stringify({ "0": ["variables.input.image"] }));
    formData.append('0', input.image);
  } else {
    // If no file, just send as normal multipart or regular JSON
    // but sticking to multipart structure for consistency if needed, 
    // though the server might prefer regular JSON.
    formData.append('map', JSON.stringify({}));
  }

  const endpoint = (process.env.NEXT_PUBLIC_GRAPHQL_URL || "").trim();
  
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    // Note: Do NOT set Content-Type header, fetch will set it automatically with the boundary
  });

  const result = await response.json();
  
  if (result.errors) {
    throw result.errors[0];
  }

  return result.data;
};

