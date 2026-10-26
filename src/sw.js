import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

// App Shell (precaching)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Navegacion SPA offline: todas las rutas devuelven index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// GET a la API con NetworkFirst (timeout 4s)
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-get-cache',
    networkTimeoutSeconds: 4,
  })
)

// Push
self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Autiva', body: event.data ? event.data.text() : '' }
  }

  const payload = data || {}
  const title = payload.title || 'Autiva'
  const options = {
    body: payload.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})