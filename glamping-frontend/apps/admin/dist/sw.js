const CACHE = 'glamping-admin-v2'
const MAX_CACHE_SIZE = 50 * 1024 * 1024

function shouldCache(url) {
  if (url.includes('/api/')) return false
  if (url.includes('/socket.io')) return false
  if (url.endsWith('.pdf')) return false
  if (url.includes('push/vapid-key')) return false
  return url.startsWith(self.location.origin)
}

async function trimCache(name, maxBytes) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  let totalSize = 0
  const entries = []
  for (const req of keys) {
    const res = await cache.match(req)
    if (res) {
      const blob = await res.blob()
      totalSize += blob.size
      entries.push({ req, size: blob.size })
    }
  }
  if (totalSize > maxBytes) {
    const toRemove = entries.slice(0, Math.ceil(entries.length / 3))
    for (const e of toRemove) {
      await cache.delete(e.req)
    }
  }
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!shouldCache(url.href)) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE).then(async (cache) => {
          await cache.put(event.request, clone)
          await trimCache(CACHE, MAX_CACHE_SIZE)
        })
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/admin/icon-192.png',
      badge: '/admin/icon-192.png',
      data: data.url || '/',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(event.notification.data || '/')
    })
  )
})
