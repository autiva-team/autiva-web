import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/cliente', () => ({ request: vi.fn(() => Promise.resolve([])) }))

import { request } from '../../api/cliente'
import {
  CATEGORIAS_RECORDATORIO,
  categoriaRecordatorio,
  concluirRecordatorio,
  crearRecordatorioFecha,
  crearRecordatorioKilometraje,
  estadoRecordatorio,
  listarRecordatoriosVehiculo,
  listarTodosRecordatorios,
} from './recordatoriosApi'

beforeEach(() => request.mockClear())

describe('categoriaRecordatorio', () => {
  it('encuentra la categoría sin importar mayúsculas', () => {
    expect(categoriaRecordatorio('SEGURO').nombre).toBe('Seguro')
    expect(categoriaRecordatorio('licencia').nombre).toBe('Licencia')
  })

  it('usa «Otro» para tipos desconocidos o vacíos', () => {
    const otro = CATEGORIAS_RECORDATORIO[CATEGORIAS_RECORDATORIO.length - 1]
    expect(categoriaRecordatorio('desconocido')).toBe(otro)
    expect(categoriaRecordatorio(undefined)).toBe(otro)
  })
})

describe('estadoRecordatorio', () => {
  it('marca como hecho lo concluido', () => {
    expect(estadoRecordatorio({ estado: 'concluido' }).tono).toBe('hecho')
  })

  it('describe recordatorios vencidos por fecha y por kilometraje', () => {
    expect(estadoRecordatorio({ criterio: 'por_fecha', estaVencido: true, diasRestantes: -1 })).toEqual({
      tono: 'vencido',
      etiqueta: 'Vencido',
      detalle: 'Venció hace 1 día.',
    })
    expect(estadoRecordatorio({ criterio: 'por_fecha', estaVencido: true, diasRestantes: -3 }).detalle).toBe('Venció hace 3 días.')
    expect(estadoRecordatorio({ criterio: 'por_fecha', estaVencido: true }).detalle).toBe('Venció hace 0 días.')
    expect(estadoRecordatorio({ criterio: 'por_kilometraje', estaVencido: true, kmRestantes: -1500 }).detalle).toBe(
      'Superaste la meta por 1,500 km.'
    )
    expect(estadoRecordatorio({ criterio: 'por_kilometraje', estaVencido: true }).detalle).toBe('Superaste la meta por 0 km.')
  })

  it('describe recordatorios próximos a vencer', () => {
    expect(estadoRecordatorio({ criterio: 'por_fecha', proximoAVencer: true, diasRestantes: 0 }).detalle).toBe('Vence hoy.')
    expect(estadoRecordatorio({ criterio: 'por_fecha', proximoAVencer: true, diasRestantes: 1 }).detalle).toBe('Vence en 1 día.')
    expect(estadoRecordatorio({ criterio: 'por_fecha', proximoAVencer: true, diasRestantes: 4 }).detalle).toBe('Vence en 4 días.')
    expect(estadoRecordatorio({ criterio: 'por_kilometraje', proximoAVencer: true, kmRestantes: 300 }).detalle).toBe('Faltan 300 km.')
    expect(estadoRecordatorio({ criterio: 'por_kilometraje', proximoAVencer: true }).detalle).toBe('Faltan 0 km.')
  })

  it('describe recordatorios al día y sin datos', () => {
    expect(estadoRecordatorio({ criterio: 'por_fecha', diasRestantes: 20 })).toMatchObject({ tono: 'vigente', detalle: 'Faltan 20 días.' })
    expect(estadoRecordatorio({ criterio: 'por_kilometraje', kmRestantes: 5000 })).toMatchObject({
      tono: 'vigente',
      detalle: 'Faltan 5,000 km.',
    })
    expect(estadoRecordatorio({ criterio: 'por_fecha' }).tono).toBe('neutro')
  })
})

describe('llamadas a la API', () => {
  it('lista los recordatorios de un vehículo con y sin filtros', async () => {
    await listarRecordatoriosVehiculo('v1')
    await listarRecordatoriosVehiculo('v1', { estado: 'pendiente', soloVencidos: true })
    expect(request.mock.calls[0][0]).toBe('/api/vehiculos/v1/recordatorios')
    expect(request.mock.calls[1][0]).toBe('/api/vehiculos/v1/recordatorios?estado=pendiente&soloVencidos=true')
  })

  it('lista los recordatorios de todos los vehículos', async () => {
    await listarTodosRecordatorios()
    await listarTodosRecordatorios({ estado: 'concluido', soloVencidos: true })
    expect(request.mock.calls[0][0]).toBe('/api/recordatorios?estado=pendiente')
    expect(request.mock.calls[1][0]).toBe('/api/recordatorios?estado=concluido&soloVencidos=true')
  })

  it('concluye un recordatorio', async () => {
    await concluirRecordatorio('r1')
    expect(request).toHaveBeenCalledWith('/api/recordatorios/r1/concluir', { method: 'PATCH' })
  })

  it('crea recordatorios por fecha y por kilometraje con valores por omisión', async () => {
    await crearRecordatorioFecha('v1', { titulo: '  Seguro  ', fechaLimite: '2026-12-01' })
    await crearRecordatorioKilometraje('v1', { titulo: 'Aceite', kmObjetivo: '55000', anticipacionDias: 15, pushPrioritaria: 1 })
    const [rutaFecha, opcionesFecha] = request.mock.calls[0]
    const [rutaKm, opcionesKm] = request.mock.calls[1]
    expect(rutaFecha).toBe('/api/vehiculos/v1/recordatorios/fecha')
    expect(JSON.parse(opcionesFecha.body)).toEqual({
      titulo: 'Seguro',
      tipo: 'otro',
      fechaLimite: '2026-12-01',
      anticipacionDias: 7,
      pushPrioritaria: false,
    })
    expect(rutaKm).toBe('/api/vehiculos/v1/recordatorios/kilometraje')
    expect(JSON.parse(opcionesKm.body)).toEqual({
      titulo: 'Aceite',
      tipo: 'mantenimiento',
      kmObjetivo: 55000,
      anticipacionDias: 15,
      pushPrioritaria: true,
    })
  })

  it('respeta el tipo indicado y corrige anticipaciones inválidas', async () => {
    await crearRecordatorioFecha('v1', { titulo: 'X', tipo: 'seguro', fechaLimite: '2026-12-01', anticipacionDias: 'abc' })
    await crearRecordatorioKilometraje('v1', { titulo: 'Y', tipo: 'otro', kmObjetivo: 1, anticipacionDias: 0 })
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ tipo: 'seguro', anticipacionDias: 7 })
    expect(JSON.parse(request.mock.calls[1][1].body)).toMatchObject({ tipo: 'otro', anticipacionDias: 7 })
  })
})
