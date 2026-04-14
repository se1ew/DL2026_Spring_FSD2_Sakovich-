import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../config'
import { AuthContext, type AuthContextValue, type AuthUser } from './AuthContext'

type AuthCredentials = {
  email: string
  password: string
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(USER_STORAGE_KEY) : null
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  )
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const clearSession = useCallback(() => {
    setUser(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [])

  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken)
    setUser(nextUser)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsBootstrapping(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Сессия недействительна')
        }

        persistSession(token, payload.user)
      } catch {
        clearSession()
      } finally {
        setIsBootstrapping(false)
      }
    }

    bootstrap()
  }, [token, clearSession, persistSession])

  const authenticate = useCallback(
    async (path: 'login' | 'register', credentials: AuthCredentials) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось выполнить действие')
      }

      persistSession(payload.token, payload.user)
    },
    [persistSession],
  )

  const login = useCallback((credentials: AuthCredentials) => authenticate('login', credentials), [authenticate])
  const register = useCallback(
    (credentials: AuthCredentials) => authenticate('register', credentials),
    [authenticate],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isBootstrapping,
      login,
      register,
      logout: clearSession,
    }),
    [user, token, isBootstrapping, login, register, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
