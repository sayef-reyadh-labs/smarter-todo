// Shares the logged-in user with any component through useContext; handles login, signup and logout.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { apiService } from "../services/api"
import type { LoginInput, SignupInput, User } from "../types/auth"

type AuthContextValue = {
  user: User | null
  loading: boolean // true while the app checks whether the cookie still has a valid session
  login: (data: LoginInput) => Promise<void>
  signup: (data: SignupInput) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiService.onSessionExpired(() => setUser(null))
    apiService
      .restoreSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    return () => apiService.onSessionExpired(null)
  }, [])

  const login = async (data: LoginInput) => {
    await apiService.login(data)
    setUser(await apiService.getMe())
  }

  const signup = async (data: SignupInput) => {
    await apiService.signup(data)
    await login({ email: data.email, password: data.password })
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } finally {
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
