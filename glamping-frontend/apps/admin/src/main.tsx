import 'core-js/stable'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function setupPush(reg: ServiceWorkerRegistration) {
  try {
    const existing = await reg.pushManager.getSubscription()
    let sub = existing
    if (!sub) {
      const res = await fetch('/api/push/vapid-key')
      if (!res.ok) return
      const json = await res.json()
      const publicKey = json?.data?.publicKey ?? json?.publicKey
      if (!publicKey) return

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('[Push] permission denied')
        return
      }

      sub = await reg.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        userVisibleOnly: true,
      })
    }

    const body = {
      endpoint: sub.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
    }

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (subRes.ok) {
      console.log('[Push] subscription: success')
    } else {
      console.log('[Push] subscription: failed', await subRes.text())
    }
  } catch (err) {
    console.log('[Push] error:', err)
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/admin/sw.js')
    .then(reg => {
      if (reg.active) setupPush(reg)
      else reg.addEventListener('activate', () => setupPush(reg))
    })
    .catch(err => console.log('[Push] SW registration failed:', err))
} else {
  console.log('[Push] ServiceWorker not supported')
}
