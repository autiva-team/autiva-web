import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/cliente', () => ({ request: vi.fn() }))

import { request } from '../api/cliente'
import {
  desuscribirPush,
  marcarNotificacionLeida,
  obtenerClavePublicaVapid,
  obtenerNotificaciones,
  obtenerSuscripcionActual,
  pushCompatible,
  suscribirPush,
} from './suscripcion'

// Clave VAPID de ejemplo (base64url válido).
const CLAVE = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

function crearSuscripcion(endpoint = 'https://push.example.com/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'clave-p256dh', auth: 'clave-auth' } }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  }
}

function instalarEntornoPush({ permiso = 'granted', existente = null, registro = true } = {}) {
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(existente)),
    subscribe: vi.fn(() => Promise.resolve(crearSuscripcion())),
  }
  const reg = { pushManager }
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve(reg),
      getRegistration: vi.fn(() => Promise.resolve(registro ? reg : undefined)),
    },
  })
  window.PushManager = function PushManager() {}
  window.Notification = { requestPermission: vi.fn(() => Promise.resolve(permiso)) }
  return pushManager
}

function quitarEntornoPush() {
  delete window.navigator.serviceWorker
  delete window.PushManager
  delete window.Notification
}

beforeEach(() => {
  request.mockReset()
})

afterEach(() => {
  quitarEntornoPush()
})

describe('compatibilidad', () => {
  it('detecta cuando el navegador no admite push', async () => {
    quitarEntornoPush()
    expect(pushCompatible()).toBe(false)
    expect(await obtenerSuscripcionActual()).toBeNull()
    await expect(suscribirPush()).rejects.toMatchObject({ amigable: true, message: expect.stringMatching(/no admite notificaciones/) })
  })

  it('detecta cuando el navegador sí admite push', () => {
    instalarEntornoPush()
    expect(pushCompatible()).toBe(true)
  })
})

describe('obtenerClavePublicaVapid', () => {
  it('lee clavePublica o publicKey', async () => {
    request.mockResolvedValueOnce({ clavePublica: 'A' }).mockResolvedValueOnce({ publicKey: 'B' }).mockResolvedValueOnce(null)
    expect(await obtenerClavePublicaVapid()).toBe('A')
    expect(await obtenerClavePublicaVapid()).toBe('B')
    expect(await obtenerClavePublicaVapid()).toBeUndefined()
    expect(request).toHaveBeenCalledWith('/api/push/clave-publica')
  })
})

describe('obtenerSuscripcionActual', () => {
  it('devuelve null si aún no hay service worker registrado', async () => {
    instalarEntornoPush({ registro: false })
    expect(await obtenerSuscripcionActual()).toBeNull()
  })

  it('devuelve la suscripción del navegador', async () => {
    const existente = crearSuscripcion()
    instalarEntornoPush({ existente })
    expect(await obtenerSuscripcionActual()).toBe(existente)
  })
})

describe('suscribirPush', () => {
  it('explica cómo resolver si se bloqueó el permiso', async () => {
    instalarEntornoPush({ permiso: 'denied' })
    await expect(suscribirPush()).rejects.toMatchObject({ amigable: true, message: expect.stringMatching(/Bloqueaste/) })
  })

  it('avisa si el servidor no tiene clave VAPID', async () => {
    instalarEntornoPush()
    request.mockResolvedValueOnce({ clavePublica: '' })
    await expect(suscribirPush()).rejects.toMatchObject({ amigable: true, message: expect.stringMatching(/no tiene configuradas/) })
  })

  it('crea la suscripción y la envía a /api/push/suscribir con el formato de la API', async () => {
    const pushManager = instalarEntornoPush()
    request.mockResolvedValueOnce({ clavePublica: CLAVE }).mockResolvedValueOnce({})
    Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 14)' })

    const suscripcion = await suscribirPush()

    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) })
    )
    expect(suscripcion.endpoint).toBe('https://push.example.com/abc')
    const [ruta, opciones] = request.mock.calls[1]
    expect(ruta).toBe('/api/push/suscribir')
    expect(JSON.parse(opciones.body)).toEqual({
      endpoint: 'https://push.example.com/abc',
      claveP256dh: 'clave-p256dh',
      claveAuth: 'clave-auth',
      dispositivo: 'Android',
    })
  })

  it('reutiliza una suscripción existente e identifica el dispositivo', async () => {
    const casos = [
      ['iPhone; CPU iPhone OS 17', 'iOS'],
      ['Windows NT 10.0', 'Windows'],
      ['Macintosh; Intel Mac OS X 14', 'macOS'],
      ['X11; Linux x86_64', 'Linux'],
      ['Desconocido', 'Navegador'],
    ]
    for (const [agente, esperado] of casos) {
      const pushManager = instalarEntornoPush({ existente: crearSuscripcion() })
      Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: agente })
      request.mockReset()
      request.mockResolvedValueOnce({ clavePublica: CLAVE }).mockResolvedValueOnce({})
      await suscribirPush()
      expect(pushManager.subscribe).not.toHaveBeenCalled()
      expect(JSON.parse(request.mock.calls[1][1].body).dispositivo).toBe(esperado)
    }
  })
})

describe('desuscribirPush', () => {
  it('no hace nada si no hay suscripción', async () => {
    instalarEntornoPush({ existente: null })
    await desuscribirPush()
    expect(request).not.toHaveBeenCalled()
  })

  it('da de baja en la API y en el navegador', async () => {
    const existente = crearSuscripcion('https://push.example.com/xyz')
    instalarEntornoPush({ existente })
    request.mockResolvedValue({})
    await desuscribirPush()
    expect(request).toHaveBeenCalledWith('/api/push/desuscribir', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example.com/xyz' }),
    })
    expect(existente.unsubscribe).toHaveBeenCalled()
  })
})

describe('bandeja de notificaciones', () => {
  it('consulta y marca como leída', async () => {
    request.mockResolvedValue([])
    await obtenerNotificaciones()
    await marcarNotificacionLeida('n1')
    expect(request.mock.calls[0]).toEqual(['/api/push/notificaciones'])
    expect(request.mock.calls[1]).toEqual(['/api/push/notificaciones/n1/leida', { method: 'PATCH' }])
  })
})
