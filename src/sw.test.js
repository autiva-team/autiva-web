import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), cleanupOutdatedCaches: vi.fn(), createHandlerBoundToURL: vi.fn() }))
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn(), NavigationRoute: vi.fn(function () {}) }))
vi.mock('workbox-strategies', () => ({ NetworkFirst: vi.fn(function () {}) }))
vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() }))

let recibirMensaje
let borrarCache
beforeEach(async () => {
  vi.resetModules()
  borrarCache = vi.fn().mockResolvedValue(true)
  vi.stubGlobal('caches', { delete: borrarCache })
  vi.stubGlobal('self', {
    skipWaiting: vi.fn(),
    location: { origin: 'https://autiva.example' },
    __WB_MANIFEST: [],
    addEventListener: (tipo, handler) => { if (tipo === 'message') recibirMensaje = handler },
  })
  await import('./sw')
})
afterEach(() => vi.unstubAllGlobals())

it('permite limpiar la caché desde la propia aplicación', async () => {
  const waitUntil = vi.fn()
  recibirMensaje({ origin: 'https://autiva.example', data: { tipo: 'AUTIVA_LIMPIAR_CACHE_API' }, waitUntil })
  expect(borrarCache).toHaveBeenCalledExactlyOnceWith('api-get-cache-v2')
  expect(waitUntil).toHaveBeenCalledOnce()
  await waitUntil.mock.calls[0][0]
})

it.each(['https://otro.example', '', 'null', undefined])('rechaza mensajes con origen %s', (origin) => {
  const waitUntil = vi.fn()
  recibirMensaje({ origin, data: { tipo: 'AUTIVA_LIMPIAR_CACHE_API' }, waitUntil })
  expect(borrarCache).not.toHaveBeenCalled()
  expect(waitUntil).not.toHaveBeenCalled()
})

it('ignora mensajes sin un comando reconocido', () => {
  recibirMensaje({ origin: 'https://autiva.example', data: { tipo: 'OTRO' } })
  recibirMensaje({ origin: 'https://autiva.example' })
  expect(borrarCache).not.toHaveBeenCalled()
})
