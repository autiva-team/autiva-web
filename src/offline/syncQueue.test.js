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
  await db.vehiculosPendientes.clear()
  await db.vehiculosVinculados.clear()
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
    request.mockResolvedValue({ cargasInsertadas: 1, serviciosInsertados: 0, cargasSincronizadasIds: [carga.id], serviciosSincronizadosIds: [servicio.id], fallidos: [] })
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
    expect(resultado).toEqual({ ok: true, sincronizados: 2, fallidos: [] })
    expect(await contarPendientes()).toBe(0)
    expect(escucha.mock.calls[0][0].detail).toEqual({ ok: true, sincronizados: 2, fallidos: [] })
  })

  it('conserva los registros si la API no confirma sus ids', async () => {
    await encolarCarga({ vehiculoId: 'v1' })
    request.mockResolvedValue(null)
    expect(await sincronizarPendientes()).toEqual({ ok: true, sincronizados: 0, fallidos: [] })
    expect(await contarPendientes()).toBe(1)
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

it('procesa éxito parcial y fallidos conservando los ids no confirmados', async () => {
  const confirmada = await encolarCarga({ vehiculoId: 'v1' })
  const fallida = await encolarCarga({ vehiculoId: 'v1' })
  const sinConfirmar = await encolarServicio({ vehiculoId: 'v1' })
  const fallidos = [{ id: fallida.id, tipo: 'carga', motivo: 'Los litros deben ser mayores a cero.' }]
  request.mockResolvedValue({ cargasSincronizadasIds: [confirmada.id], serviciosSincronizadosIds: [], fallidos })
  expect(await sincronizarPendientes()).toEqual({ ok: true, sincronizados: 1, fallidos })
  expect(await db.cargasPendientes.count()).toBe(0)
  expect(await db.serviciosPendientes.get(sinConfirmar.id)).toBeTruthy()
})

it('persiste la captura antes de enviar el lote y conserva el GUID en el detalle', async () => {
  const { capturarCarga } = await import('./syncQueue')
  request.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/sincronizacion') {
      const enviada = JSON.parse(opciones.body).cargas[0]
      expect(await db.cargasPendientes.get(enviada.id)).toBeTruthy()
      return { cargasSincronizadasIds: [enviada.id], serviciosSincronizadosIds: [], fallidos: [] }
    }
    return { id: 'c1', litros: 30 }
  })
  const resultado = await capturarCarga({ id: 'c1', vehiculoId: 'v1', litros: 30 })
  expect(resultado.pendiente).toBe(true)
  await vi.waitFor(async () => expect(await contarPendientes()).toBe(0))
  expect(request.mock.calls).toHaveLength(1)
})

it('conserva la captura offline sin intentar registrar por separado', async () => {
  const { capturarServicio } = await import('./syncQueue')
  enLinea(false)
  const resultado = await capturarServicio({ id: 's1', vehiculoId: 'v1', costo: 100 })
  expect(resultado.pendiente).toBe(true)
  expect(await db.serviciosPendientes.get('s1')).toBeTruthy()
  expect(request).not.toHaveBeenCalled()
})

it('la captura responde antes de que termine una sincronización lenta', async () => {
  const { capturarCarga } = await import('./syncQueue')
  let resolver
  request.mockReturnValue(new Promise((r) => { resolver = r }))
  const inicio = await capturarCarga({ id: 'lenta', vehiculoId: 'v1', litros: 10 })
  expect(inicio.pendiente).toBe(true)
  expect(await db.cargasPendientes.get('lenta')).toBeTruthy()
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
  resolver({ cargasSincronizadasIds: ['lenta'], serviciosSincronizadosIds: [], fallidos: [] })
  await vi.waitFor(async () => expect(await contarPendientes()).toBe(0))
})
