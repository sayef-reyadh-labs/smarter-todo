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

// One login session (a browser or device); current is the one making the request.
export type Session = {
  id: string
  user_agent: string | null
  ip_address: string | null
  started_at: string
  last_used_at: string
  current: boolean
}
