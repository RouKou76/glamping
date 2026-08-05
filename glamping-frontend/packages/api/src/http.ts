import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN_KEY = 'glamp-token'
const REFRESH_LOCK_KEY = 'glamp-refreshing'
const REFRESH_LOCK_TTL = 5_000
const REFRESH_WAIT_TIMEOUT = 12_000

interface ApiResponse<T> {
  data: T
  timestamp: string
}

interface UseApiOptions {
  immediate?: boolean
}

let refreshPromise: Promise<boolean> | null = null

function releaseRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY)
}

function waitForOtherRefresh(): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + REFRESH_WAIT_TIMEOUT
    const check = () => {
      const lock = localStorage.getItem(REFRESH_LOCK_KEY)
      const token = localStorage.getItem(TOKEN_KEY)
      if (lock === null) {
        resolve(Boolean(token))
        return
      }
      if (Date.now() > deadline) {
        resolve(Boolean(token))
        return
      }
      setTimeout(check, 100)
    }
    check()
  })
}

async function tryAcquireLock(): Promise<boolean> {
  const owner = localStorage.getItem(REFRESH_LOCK_KEY)
  if (owner) {
    const ts = Number(owner.split(':')[0])
    if (!Number.isNaN(ts) && Date.now() - ts < REFRESH_LOCK_TTL) return false
  }
  const mine = `${Date.now()}:${Math.random().toString(36).slice(2)}`
  localStorage.setItem(REFRESH_LOCK_KEY, mine)
  await new Promise((r) => setTimeout(r, 50))
  return localStorage.getItem(REFRESH_LOCK_KEY) === mine
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  if (!(await tryAcquireLock())) return waitForOtherRefresh()

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) return false
      const result: ApiResponse<{ accessToken: string }> = await response.json()
      localStorage.setItem(TOKEN_KEY, result.data.accessToken)
      return true
    } catch {
      return false
    } finally {
      releaseRefreshLock()
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function fetchWithRefresh<T>(url: string, options: RequestInit): Promise<T> {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { ...options.headers as Record<string, string>, ...getAuthHeaders() },
  })

  if (response.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: { ...options.headers as Record<string, string>, ...getAuthHeaders() },
      })
    } else {
      localStorage.removeItem(TOKEN_KEY)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/admin/login') {
        const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
        window.location.href = loginPath
      }
      throw new Error('Session expired')
    }
  }

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const result: ApiResponse<T> = await response.json()
  return result.data
}

export function useApi<T>(path: string, options: UseApiOptions = {}) {
  const { immediate = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await fetchWithRefresh<T>(`${API_BASE}${path}`, { method: 'GET', signal: controller.signal })
      if (!controller.signal.aborted) setData(result)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [path])

  useEffect(() => { if (immediate) fetchData(); return () => { abortRef.current?.abort() } }, [fetchData, immediate])

  return { data, loading, error, refetch: fetchData }
}

export async function apiGet<T>(path: string): Promise<T> {
  return fetchWithRefresh<T>(`${API_BASE}${path}`, { method: 'GET' })
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetchWithRefresh<T>(`${API_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return fetchWithRefresh<T>(`${API_BASE}${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function apiDelete(path: string): Promise<void> {
  await fetchWithRefresh<void>(`${API_BASE}${path}`, { method: 'DELETE' })
}
