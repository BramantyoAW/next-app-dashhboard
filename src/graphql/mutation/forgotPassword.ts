import { gqlFetch } from '@/lib/graphqlClient';

export const forgotPasswordService = async (email: string) => {
  const FORGOT_PASSWORD_MUTATION = `
    mutation forgotPassword($email: String!) {
      forgotPassword(email: $email) {
        status
        message
      }
    }
  `;

  const data = await gqlFetch<{ forgotPassword: { status: boolean; message: string } }>(
    FORGOT_PASSWORD_MUTATION,
    { email }
  );

  if (!data?.forgotPassword?.status) {
    throw new Error(data?.forgotPassword?.message || 'Gagal mengirim email reset password');
  }

  return data.forgotPassword;
};

export const resetPasswordService = async (
  token: string,
  email: string,
  password: string,
  password_confirmation: string
) => {
  const RESET_PASSWORD_MUTATION = `
    mutation resetPassword(
      $token: String!
      $email: String!
      $password: String!
      $password_confirmation: String!
    ) {
      resetPassword(
        token: $token
        email: $email
        password: $password
        password_confirmation: $password_confirmation
      ) {
        status
        message
      }
    }
  `;

  const data = await gqlFetch<{ resetPassword: { status: boolean; message: string } }>(
    RESET_PASSWORD_MUTATION,
    { token, email, password, password_confirmation }
  );

  if (!data?.resetPassword?.status) {
    throw new Error(data?.resetPassword?.message || 'Gagal mengatur ulang password');
  }

  return data.resetPassword;
};

