import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./cliente', () => ({ request: vi.fn(() => Promise.resolve({ ok: true })) }))

import { request } from './cliente'
import * as vehiculos from '../features/vehiculos/vehiculosApi'
import * as cargas from '../features/cargas/cargasApi'
import * as servicios from '../features/servicios/serviciosApi'
import { obtenerHome } from '../features/home/homeApi'

const cuerpo = (llamada) => JSON.parse(llamada[1].body)

beforeEach(() => {
  request.mockClear()
})

describe('vehiculosApi', () => {
  it('registra un vehículo con color y foto opcionales', async () => {
    await vehiculos.registrarVehiculo({ marca: 'Nissan', modelo: 'Versa', anio: 2020, placas: 'ABC-123', kilometrajeInicial: 100 })
    const [ruta, opciones] = request.mock.calls[0]
    expect(ruta).toBe('/api/vehiculos')
    expect(opciones.method).toBe('POST')
    expect(cuerpo(request.mock.calls[0])).toEqual({
      marca: 'Nissan',
      modelo: 'Versa',
      anio: 2020,
      placas: 'ABC-123',
      kilometrajeInicial: 100,
      color: null,
      fotoUrl: null,
    })
  })

  it('envía color y foto cuando existen', async () => {
    await vehiculos.registrarVehiculo({ marca: 'A', modelo: 'B', anio: 2021, placas: 'X', kilometrajeInicial: 0, color: 'Gris', fotoUrl: 'u' })
    expect(cuerpo(request.mock.calls[0])).toMatchObject({ color: 'Gris', fotoUrl: 'u' })
  })

  it('consulta, marca activo, actualiza odómetro y obtiene resumen', async () => {
    await vehiculos.listarVehiculos()
    await vehiculos.obtenerVehiculo('v1')
    await vehiculos.marcarVehiculoActivo('v1')
    await vehiculos.actualizarOdometro('v1', 45000)
    await vehiculos.obtenerResumenVehiculo('v1')
    const rutas = request.mock.calls.map((c) => c[0])
    expect(rutas).toEqual([
      '/api/vehiculos',
      '/api/vehiculos/v1',
      '/api/vehiculos/v1/activo',
      '/api/vehiculos/v1/odometro',
      '/api/vehiculos/v1/resumen',
    ])
    expect(request.mock.calls[2][1]).toEqual({ method: 'PATCH' })
    expect(cuerpo(request.mock.calls[3])).toEqual({ odometroActual: 45000 })
  })
})

describe('cargasApi', () => {
  it('registra una carga', async () => {
    await cargas.registrarCarga('v1', { litros: 30 })
    expect(request.mock.calls[0][0]).toBe('/api/vehiculos/v1/cargas')
    expect(cuerpo(request.mock.calls[0])).toEqual({ litros: 30 })
  })

  it('arma el historial con paginación y filtros opcionales', async () => {
    await cargas.obtenerHistorialCargas('v1')
    await cargas.obtenerHistorialCargas('v1', 2, 5, '2026-01-01', '2026-02-01')
    expect(request.mock.calls[0][0]).toBe('/api/vehiculos/v1/cargas?pagina=1&tamano=10')
    expect(request.mock.calls[1][0]).toBe('/api/vehiculos/v1/cargas?pagina=2&tamano=5&desde=2026-01-01&hasta=2026-02-01')
  })

  it('obtiene una carga y el rendimiento', async () => {
    await cargas.obtenerCarga('c1')
    await cargas.obtenerRendimiento('v1')
    expect(request.mock.calls.map((c) => c[0])).toEqual(['/api/cargas/c1', '/api/vehiculos/v1/cargas/rendimiento'])
  })
})

describe('serviciosApi', () => {
  it('registra, lista y obtiene servicios', async () => {
    await servicios.registrarServicio('v1', { costo: 500 })
    await servicios.obtenerHistorialServicios('v1')
    await servicios.obtenerHistorialServicios('v1', 3, 1)
    await servicios.obtenerServicio('s1')
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      '/api/vehiculos/v1/servicios',
      '/api/vehiculos/v1/servicios?pagina=1&tamano=10',
      '/api/vehiculos/v1/servicios?pagina=3&tamano=1',
      '/api/servicios/s1',
    ])
    expect(cuerpo(request.mock.calls[0])).toEqual({ costo: 500 })
  })
})

describe('homeApi', () => {
  it('consulta el estado del servicio', async () => {
    await obtenerHome()
    expect(request).toHaveBeenCalledWith('/api/home')
  })
})
