import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiPost, apiGet, subscribeToPush, unsubscribeFromPush } from '@glamping/api'

const AUTH_EVENT_KEY = 'glamp-auth-event'
const TOKEN_KEY = 'glamp-token'
const SESSION_STATE_KEY = 'glamp-session-state'

function broadcastAuthEvent(type: 'login' | 'logout') {
  localStorage.setItem(AUTH_EVENT_KEY, `${type}:${Date.now()}`)
}

interface User {
  id: string
  login: string
  name: string
  role: { name: string; permissions: string[] }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasTicketAccess: () => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasTicketAccess: () => false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    apiGet<User>('/api/auth/me')
      .then(user => {
        setUser(user)
        subscribeToPush().then(ok => console.log('[Push] subscription:', ok ? 'success' : 'failed'))
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_EVENT_KEY || !e.newValue) return
      if (e.newValue.startsWith('logout')) {
        localStorage.setItem(SESSION_STATE_KEY, 'logged-out')
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      } else if (e.newValue.startsWith('login')) {
        apiGet<User>('/api/auth/me')
          .then(u => {
            setUser(u)
            if (window.location.pathname === '/admin/login') window.location.assign('/admin/')
          })
          .catch(() => localStorage.removeItem(TOKEN_KEY))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (login: string, password: string) => {
    const res = await apiPost<{ accessToken: string; user: User }>('/api/auth/login', { login, password })
    localStorage.setItem(SESSION_STATE_KEY, 'logged-in')
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    setUser(res.user)
    broadcastAuthEvent('login')
    subscribeToPush().then(ok => console.log('[Push] subscription:', ok ? 'success' : 'failed'))
  }, [])

  const logout = useCallback(() => {
    unsubscribeFromPush()
    apiPost('/api/auth/logout', {}).catch(() => {})
    localStorage.setItem(SESSION_STATE_KEY, 'logged-out')
    broadcastAuthEvent('logout')
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false
    if (user.role.name === 'admin') return true
    return user.role.permissions.includes(permission)
  }, [user])

  const hasAnyPermission = useCallback((...permissions: string[]) => {
    return permissions.some(p => hasPermission(p))
  }, [hasPermission])

  const hasTicketAccess = useCallback(() => {
    if (!user) return false
    if (user.role.name === 'admin') return true
    return user.role.permissions.some(p =>
      p === 'view_tickets' || p.startsWith('view_tickets:') || p === 'manage_tickets'
    )
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasAnyPermission, hasTicketAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
