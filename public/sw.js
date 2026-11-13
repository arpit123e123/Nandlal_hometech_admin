// Demo service worker: caches the app shell + same-origin GETs so the UI opens offline.
const C = 'nhu-admin-v1'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(
    caches.open(C).then(async (c) => {
      const hit = await c.match(r)
      const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res }).catch(() => hit || c.match('/index.html'))
      return hit || net
    })
  )
})
