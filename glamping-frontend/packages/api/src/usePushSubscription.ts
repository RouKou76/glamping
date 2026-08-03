import { useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch {
      if (i === attempts - 1) throw new Error('Max retries exceeded')
      await new Promise(r => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw new Error('Unreachable')
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()
    let subscription = existing
    if (!subscription) {
      const keyRes = await fetch(`${API_BASE}/api/push/vapid-key`)
      const { publicKey } = await keyRes.json()
      if (!publicKey) return false

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    const sub = subscription.toJSON()
    await withRetry(() =>
      fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh ?? '',
          auth: sub.keys?.auth ?? '',
        }),
      }).then(r => { if (!r.ok) throw new Error('Subscribe failed') })
    )

    return true
  } catch (e) {
    console.warn('[Push] subscribe failed:', e)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return

    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })

    await subscription.unsubscribe()
  } catch {
    // ignore
  }
}

export function usePushSubscription() {
  const subscribe = useCallback(async () => {
    await subscribeToPush()
  }, [])

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush()
  }, [])

  useEffect(() => {
    subscribe()
  }, [subscribe])

  return { subscribe, unsubscribe }
}
