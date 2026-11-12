import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/cliente', () => ({ request: vi.fn() }))

import { request } from '../api/cliente'
import { db } from './db'
import {
  EVENTO_PENDIENTES,
  contarPendientes,
  encolarCarga,
  encolarServicio,
  esErrorDeRed,
  registrarSincronizacionAutomatica,
  sincronizarEnSegundoPlano,
  sincronizarPendientes,
} from './syncQueue'

function enLinea(valor) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => valor })
}

beforeEach(async () => {
  request.mockReset()
  enLinea(true)
  localStorage.setItem('autiva_token', 'token-de-prueba')
  await db.cargasPendientes.clear()
  await db.serviciosPendientes.clear()
})

afterEach(() => {
  enLinea(true)
})

describe('esErrorDeRed', () => {
  it('distingue fallas de red de respuestas HTTP', () => {
    expect(esErrorDeRed(new TypeError('Failed to fetch'))).toBe(true)
    expect(esErrorDeRed(undefined)).toBe(true)
    expect(esErrorDeRed({ status: 500 })).toBe(false)
  })
})

describe('encolar', () => {
  it('guarda una carga con id, fecha y hora, y avisa el cambio', async () => {
    const escucha = vi.fn()
    window.addEventListener(EVENTO_PENDIENTES, escucha)
    const registro = await encolarCarga({ vehiculoId: 'v1', litros: 30 })
    window.removeEventListener(EVENTO_PENDIENTES, escucha)

    expect(registro.id).toMatch(/[0-9a-f-]{36}/)
    expect(registro.fechaHora).toBe(registro.creadoEn)
    expect(await db.cargasPendientes.get(registro.id)).toMatchObject({ vehiculoId: 'v1', litros: 30 })
    expect(escucha).toHaveBeenCalledTimes(1)
  })

  it('conserva el id y la fecha y hora capturados', async () => {
    const registro = await encolarCarga({ id: 'carga-1', fechaHora: '2026-01-01T10:00:00.000Z' })
    expect(registro).toMatchObject({ id: 'carga-1', fechaHora: '2026-01-01T10:00:00.000Z' })
  })

  it('guarda servicios y cuenta todos los pendientes', async () => {
    const servicio = await encolarServicio({ vehiculoId: 'v1', costo: 500 })
    await encolarServicio({ id: 'servicio-2' })
    await encolarCarga({ vehiculoId: 'v1' })
    expect(servicio.id).toBeTruthy()
    expect(await contarPendientes()).toBe(3)
  })
})

describe('sincronizarPendientes', () => {
  it('no envía nada sin sesión', async () => {
    localStorage.removeItem('autiva_token')
    expect(await sincronizarPendientes()).toEqual({ ok: false, sinSesion: true })
    expect(request).not.toHaveBeenCalled()
  })

  it('no envía nada sin conexión', async () => {
    enLinea(false)
    expect(await sincronizarPendientes()).toEqual({ ok: false, sinConexion: true })
    expect(request).not.toHaveBeenCalled()
  })

  it('no llama a la API si la cola está vacía', async () => {
    expect(await sincronizarPendientes()).toEqual({ ok: true, sincronizados: 0 })
    expect(request).not.toHaveBeenCalled()
  })

  it('envía el lote, borra lo enviado y reporta lo insertado por la API', async () => {
    const carga = await encolarCarga({ vehiculoId: 'v1' })
    const servicio = await encolarServicio({ vehiculoId: 'v1' })
    request.mockResolvedValue({ cargasInsertadas: 1, serviciosInsertados: 0 })
    const escucha = vi.fn()
    window.addEventListener(EVENTO_PENDIENTES, escucha)

    const resultado = await sincronizarPendientes()
    window.removeEventListener(EVENTO_PENDIENTES, escucha)

    expect(request).toHaveBeenCalledTimes(1)
    const [ruta, opciones] = request.mock.calls[0]
    expect(ruta).toBe('/api/sincronizacion')
    const enviado = JSON.parse(opciones.body)
    expect(enviado.cargas.map((c) => c.id)).toEqual([carga.id])
    expect(enviado.servicios.map((s) => s.id)).toEqual([servicio.id])
    expect(resultado).toEqual({ ok: true, sincronizados: 1 })
    expect(await contarPendientes()).toBe(0)
    expect(escucha.mock.calls[0][0].detail).toEqual({ ok: true, sincronizados: 1 })
  })

  it('si la API no detalla, cuenta todo lo enviado', async () => {
    await encolarCarga({ vehiculoId: 'v1' })
    request.mockResolvedValue(null)
    expect(await sincronizarPendientes()).toEqual({ ok: true, sincronizados: 1 })
  })

  it('conserva la cola si la API falla', async () => {
    await encolarCarga({ vehiculoId: 'v1' })
    const error = Object.assign(new Error('Error 500'), { status: 500 })
    request.mockRejectedValue(error)
    expect(await sincronizarPendientes()).toEqual({ ok: false, error })
    expect(await contarPendientes()).toBe(1)
  })

  it('no duplica el envío si se llama dos veces seguidas', async () => {
    await encolarCarga({ vehiculoId: 'v1' })
    let resolver
    request.mockReturnValue(new Promise((r) => { resolver = r }))
    const primera = sincronizarPendientes()
    const segunda = sincronizarPendientes()
    expect(segunda).toBe(primera)
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    resolver({})
    await primera
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('sincronización en segundo plano', () => {
  it('registra un error en consola sin lanzar excepciones', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    const lectura = vi.spyOn(db.cargasPendientes, 'toArray').mockRejectedValue(new Error('IndexedDB no disponible'))
    sincronizarEnSegundoPlano()
    await vi.waitFor(() => expect(consola).toHaveBeenCalled())
    expect(consola.mock.calls[0][0]).toMatch(/No se pudo sincronizar/)
    lectura.mockRestore()
  })

  it('sincroniza al abrir la app y al volver la conexión, registrándose una sola vez', async () => {
    const agregar = vi.spyOn(window, 'addEventListener')
    request.mockResolvedValue({})
    await encolarCarga({ vehiculoId: 'v1' })

    registrarSincronizacionAutomatica()
    registrarSincronizacionAutomatica()

    const registrosOnline = agregar.mock.calls.filter(([evento]) => evento === 'online')
    expect(registrosOnline).toHaveLength(1)
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    await encolarCarga({ vehiculoId: 'v1' })
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })
})
