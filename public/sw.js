const CACHE = 'xiaoyang-workbench-v3'
const BRAND_LOGOS = [
  './brands/luckin-cropped.webp',
  './brands/mollytea.webp',
  './brands/alittletea.webp',
  './brands/heytea.webp',
  './brands/chayan-icon.webp',
  './brands/manner.webp',
  './brands/guming-icon.webp',
  './brands/chabaidao-icon.webp',
  './brands/chagee.webp',
]
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', ...BRAND_LOGOS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  const isLocalImage = requestUrl.origin === self.location.origin && event.request.destination === 'image'

  if (isLocalImage) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
        return response
      }))
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  )
})
