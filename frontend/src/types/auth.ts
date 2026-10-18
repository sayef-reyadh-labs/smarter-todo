// TypeScript shapes that mirror the backend auth schemas.
export type User = {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type SignupInput = {
  email: string
  name: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

export type PasswordChangeInput = {
  current_password: string
  new_password: string
}
