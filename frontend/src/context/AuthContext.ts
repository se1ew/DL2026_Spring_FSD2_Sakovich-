import { createContext } from 'react'

export type AuthUser = {
  id: string
  email: string
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isBootstrapping: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  register: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
