import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN_KEY = 'glamp-token'
const SESSION_STATE_KEY = 'glamp-session-state'
const REFRESH_LOCK_KEY = 'glamp-refreshing'
const REFRESH_LOCK_TTL = 3_000
const REFRESH_HEARTBEAT_MS = 1_000
const REFRESH_WAIT_TIMEOUT = 20_000
const REFRESH_MAX_ATTEMPTS = 5

interface ApiResponse<T> {
  data: T
  timestamp: string
}

interface UseApiOptions {
  immediate?: boolean
}

let refreshPromise: Promise<boolean> | null = null

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function lockSuffix(value: string | null): string | null {
  if (!value) return null
  return value.split(':')[1] ?? null
}

function lockAgeMs(value: string | null): number {
  if (!value) return Infinity
  const ts = Number(value.split(':')[0])
  return Number.isNaN(ts) ? Infinity : Date.now() - ts
}

function isLockFresh(value: string | null): boolean {
  return value !== null && lockAgeMs(value) < REFRESH_LOCK_TTL
}

async function doRefresh(owner: string): Promise<boolean> {
  const heartbeat = setInterval(() => {
    const cur = localStorage.getItem(REFRESH_LOCK_KEY)
    if (lockSuffix(cur) === lockSuffix(owner)) {
      localStorage.setItem(REFRESH_LOCK_KEY, `${Date.now()}:${lockSuffix(owner)}`)
    }
  }, REFRESH_HEARTBEAT_MS)

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
    clearInterval(heartbeat)
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  if (localStorage.getItem(SESSION_STATE_KEY) === 'logged-out') return false

  refreshPromise = (async () => {
    let lastResult = false
    const totalDeadline = Date.now() + REFRESH_WAIT_TIMEOUT
    for (let attempt = 0; attempt < REFRESH_MAX_ATTEMPTS && Date.now() < totalDeadline; attempt++) {
      const lock = localStorage.getItem(REFRESH_LOCK_KEY)

      if (!isLockFresh(lock)) {
        const mine = `${Date.now()}:${Math.random().toString(36).slice(2)}`
        localStorage.setItem(REFRESH_LOCK_KEY, mine)
        await sleep(60)
        if (localStorage.getItem(REFRESH_LOCK_KEY) === mine) {
          lastResult = await doRefresh(mine)
          localStorage.removeItem(REFRESH_LOCK_KEY)
          return lastResult
        }
        continue
      }

      const tokenBefore = localStorage.getItem(TOKEN_KEY)
      while (Date.now() < totalDeadline) {
        const cur = localStorage.getItem(REFRESH_LOCK_KEY)
        if (cur === null || !isLockFresh(cur)) break
        await sleep(100)
      }
      lastResult = localStorage.getItem(TOKEN_KEY) !== tokenBefore
      if (lastResult) return true
    }
    return lastResult
  })().finally(() => {
    refreshPromise = null
  })

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
