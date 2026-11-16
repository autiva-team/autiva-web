import { beforeEach, expect, it, vi } from 'vitest'
import { db } from './db'
import { encolarVehiculo, vehiculoLocal } from './vehiculosPendientes'
import { encolarCarga, encolarServicio, sincronizarPendientes, contarPendientes } from './syncQueue'
import { request } from '../api/cliente'
vi.mock('../api/cliente', () => ({ request: vi.fn() }))
const datos = { marca: 'Nissan', modelo: 'Versa', anio: 2020, placas: 'ABC123', kilometrajeInicial: 100, color: null, fotoUrl: null }
const conexion = (valor) => Object.defineProperty(navigator, 'onLine', { configurable: true, value: valor })
beforeEach(async () => {
  conexion(false)
  localStorage.clear()
  localStorage.setItem('autiva_token', 't1')
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u1' }))
  request.mockReset()
  await Promise.all([db.vehiculosPendientes.clear(), db.vehiculosVinculados.clear(), db.cargasPendientes.clear(), db.serviciosPendientes.clear()])
})

it('conserva vehículo y registros al recargar; registra el vehículo antes del lote', async () => {
  const local = (await encolarVehiculo(datos)).datos
  await encolarCarga({ id: 'c1', vehiculoId: local.id, litros: 30, costoTotal: 600, odometro: 200 })
  await encolarServicio({ id: 's1', vehiculoId: local.id, costo: 100, kilometrajeServicio: 200 })
  db.close(); await db.open()
  expect((await vehiculoLocal(local.id)).placas).toBe('ABC123')
  expect(await contarPendientes()).toBe(3)
  const orden = []
  request.mockImplementation(async (ruta, opciones) => {
    orden.push(ruta)
    if (ruta === '/api/vehiculos') return { ...datos, id: 'servidor-1' }
    const lote = JSON.parse(opciones.body)
    expect(lote.cargas[0].vehiculoId).toBe('servidor-1')
    expect(lote.servicios[0].vehiculoId).toBe('servidor-1')
    return { cargasSincronizadasIds: ['c1'], serviciosSincronizadosIds: ['s1'], fallidos: [] }
  })
  conexion(true)
  await sincronizarPendientes()
  expect(orden).toEqual(['/api/vehiculos', '/api/sincronizacion'])
  expect(await contarPendientes()).toBe(0)
})

it('si se pierde la respuesta, reconcilia por placas sin duplicar el alta', async () => {
  const local = (await encolarVehiculo(datos)).datos
  request.mockRejectedValueOnce(new TypeError('Se perdió la respuesta'))
  conexion(true)
  await sincronizarPendientes()
  expect(await vehiculoLocal(local.id)).toBeTruthy()
  request.mockResolvedValueOnce([{ ...datos, id: 'servidor-1' }])
  await sincronizarPendientes()
  expect(request.mock.calls.filter(([, o]) => o?.method === 'POST')).toHaveLength(1)
  expect(await db.vehiculosPendientes.count()).toBe(0)
  expect((await db.vehiculosVinculados.get(local.id)).servidorId).toBe('servidor-1')
})

it('conserva un rechazo de validación para corregirlo y no lo reintenta sin cambios', async () => {
  const local = (await encolarVehiculo(datos)).datos
  request.mockRejectedValue(Object.assign(new Error('Placas repetidas.'), { status: 409 }))
  conexion(true)
  await sincronizarPendientes()
  expect((await vehiculoLocal(local.id)).errorSincronizacion).toBe('Placas repetidas.')
  await sincronizarPendientes()
  expect(request).toHaveBeenCalledTimes(1)
  expect(await contarPendientes()).toBe(1)
})

it('no envía los pendientes de otra cuenta', async () => {
  await encolarVehiculo(datos)
  await encolarCarga({ vehiculoId: 'v1', litros: 10 })
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u2' }))
  localStorage.setItem('autiva_token', 't2')
  conexion(true)
  await sincronizarPendientes()
  expect(request).not.toHaveBeenCalled()
  expect(await db.vehiculosPendientes.count()).toBe(1)
  expect(await db.cargasPendientes.count()).toBe(1)
})
