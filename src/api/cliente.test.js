import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request, limpiarCacheApi, invalidarDatos } from './cliente'

function respuesta({ ok = true, status = 200, json, tipo = 'application/json', texto = '' } = {}) {
  return {
    ok,
    status,
    headers: { get: () => tipo },
    json: json ? () => Promise.resolve(json) : () => Promise.reject(new Error('sin cuerpo')),
    text: () => Promise.resolve(texto),
  }
}

beforeEach(() => {
  limpiarCacheApi()
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  delete globalThis.fetch
})

describe('request', () => {
  it('envía JSON y agrega el token cuando hay sesión', async () => {
    localStorage.setItem('autiva_token', 'abc')
    fetch.mockResolvedValue(respuesta({ json: { ok: 1 } }))
    const datos = await request('/api/vehiculos', { method: 'POST', headers: { 'X-Extra': '1' } })
    expect(datos).toEqual({ ok: 1 })
    const [url, opciones] = fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/vehiculos$/)
    expect(opciones.headers).toEqual({ 'Content-Type': 'application/json', 'X-Extra': '1', Authorization: 'Bearer abc' })
  })

  it('no agrega token sin sesión y devuelve null en 204', async () => {
    fetch.mockResolvedValue(respuesta({ status: 204 }))
    expect(await request('/api/auth/logout')).toBeNull()
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('devuelve texto cuando la respuesta no es JSON', async () => {
    fetch.mockResolvedValue(respuesta({ tipo: 'text/plain', texto: 'ok' }))
    expect(await request('/api/home')).toBe('ok')
  })

  it('lanza un error con el mensaje, código y errores de la API', async () => {
    fetch.mockResolvedValue(respuesta({ ok: false, status: 400, json: { mensaje: 'Datos inválidos.', errores: ['Falta el título.'] } }))
    await expect(request('/api/recordatorios')).rejects.toMatchObject({
      message: 'Datos inválidos.',
      status: 400,
      errores: ['Falta el título.'],
    })
  })

  it('usa «Error <código>» si la respuesta de error no trae cuerpo', async () => {
    fetch.mockResolvedValue(respuesta({ ok: false, status: 500 }))
    await expect(request('/api/home')).rejects.toMatchObject({ message: 'Error 500', status: 500 })
  })

  it('cierra la sesión local ante un 401 fuera de /api/auth', async () => {
    localStorage.setItem('autiva_token', 'vencido')
    localStorage.setItem('autiva_usuario', '{}')
    const escucha = vi.fn()
    window.addEventListener('autiva:unauthorized', escucha)
    fetch.mockResolvedValue(respuesta({ ok: false, status: 401 }))
    await expect(request('/api/vehiculos')).rejects.toMatchObject({ status: 401 })
    window.removeEventListener('autiva:unauthorized', escucha)
    expect(localStorage.getItem('autiva_token')).toBeNull()
    expect(localStorage.getItem('autiva_usuario')).toBeNull()
    expect(escucha).toHaveBeenCalledTimes(1)
  })

  it('no cierra sesión si el 401 viene del inicio de sesión', async () => {
    localStorage.setItem('autiva_token', 'abc')
    fetch.mockResolvedValue(respuesta({ ok: false, status: 401, json: { mensaje: 'Credenciales inválidas.' } }))
    await expect(request('/api/auth/login')).rejects.toMatchObject({ message: 'Credenciales inválidas.' })
    expect(localStorage.getItem('autiva_token')).toBe('abc')
  })
})

it('omite Authorization para recuperar contraseña aunque exista sesión', async () => {
  localStorage.setItem('autiva_token', 'abc')
  fetch.mockResolvedValue(respuesta({ json: { mensaje: 'Enlace solicitado' } }))
  await request('/api/auth/recuperar-contrasena', { method: 'POST', sinAutenticacion: true })
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
  expect(fetch.mock.calls[0][1]).not.toHaveProperty('sinAutenticacion')
})

it('comparte una sola petición GET entre consultas simultáneas', async () => {
  localStorage.setItem('autiva_token', 'abc')
  let resolver
  fetch.mockReturnValue(new Promise((r) => { resolver = r }))
  const uno = request('/api/vehiculos')
  const dos = request('/api/vehiculos')
  expect(fetch).toHaveBeenCalledTimes(1)
  resolver(respuesta({ json: [{ id: 'v1' }] }))
  expect(await uno).toEqual(await dos)
})

it('devuelve la caché inmediatamente mientras revalida una petición lenta', async () => {
  localStorage.setItem('autiva_token', 'abc')
  fetch.mockResolvedValueOnce(respuesta({ json: [{ id: 'v1' }] }))
  await request('/api/vehiculos')
  invalidarDatos()
  let resolver
  fetch.mockReturnValue(new Promise((r) => { resolver = r }))
  expect(await request('/api/vehiculos')).toEqual([{ id: 'v1' }])
  expect(fetch).toHaveBeenCalledTimes(2)
  resolver(respuesta({ json: [{ id: 'v2' }] }))
  await vi.waitFor(async () => expect(await request('/api/vehiculos')).toEqual([{ id: 'v2' }]))
})

it('no comparte datos guardados entre cuentas', async () => {
  localStorage.setItem('autiva_token', 't1')
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u1' }))
  fetch.mockResolvedValueOnce(respuesta({ json: [{ id: 'privado' }] }))
  await request('/api/vehiculos')
  localStorage.setItem('autiva_token', 't2')
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u2' }))
  fetch.mockResolvedValueOnce(respuesta({ json: [] }))
  expect(await request('/api/vehiculos')).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('sin conexión devuelve datos guardados sin esperar a la red', async () => {
  localStorage.setItem('autiva_token', 'abc')
  fetch.mockResolvedValue(respuesta({ json: [{ id: 'v1' }] }))
  await request('/api/vehiculos')
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  try { expect(await request('/api/vehiculos')).toEqual([{ id: 'v1' }]); expect(fetch).toHaveBeenCalledTimes(1) }
  finally { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }) }
})
