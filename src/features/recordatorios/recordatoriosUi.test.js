import { describe, expect, it } from 'vitest'
import {
  detalleFecha,
  fechaHoy,
  formVacio,
  formatearFecha,
  odometroDe,
  ordenarPorUrgencia,
  validarRecordatorio,
} from './recordatoriosUi'

describe('utilidades de recordatorios', () => {
  it('formatea fechas y el formulario vacío', () => {
    expect(fechaHoy(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(fechaHoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(formatearFecha('')).toBe('')
    expect(formatearFecha('2026-11-20T00:00:00Z')).toMatch(/20/)
    expect(formVacio('v1')).toMatchObject({ vehiculoId: 'v1', tipo: 'fecha', anticipacionDias: 7 })
    expect(formVacio().vehiculoId).toBe('')
  })

  it('describe el vencimiento por fecha o por kilometraje', () => {
    expect(detalleFecha({ criterio: 'por_fecha', fechaLimite: '2026-11-20' })).toMatch(/^Vence el /)
    expect(detalleFecha({ criterio: 'por_fecha' })).toBe('Sin fecha definida')
    expect(detalleFecha({ fechaLimite: '2026-11-20' })).toMatch(/^Vence el /)
    expect(detalleFecha({ criterio: 'por_kilometraje', kmObjetivo: 65000 })).toBe('Meta: 65,000 km')
    expect(detalleFecha({ criterio: 'por_kilometraje' })).toBe('Meta: 0 km')
  })

  it('lee el odómetro del vehículo', () => {
    expect(odometroDe({ odometroActual: 100 })).toBe(100)
    expect(odometroDe({ kilometrajeInicial: 50 })).toBe(50)
    expect(odometroDe(null)).toBe(0)
  })

  it('ordena por urgencia y luego por fecha', () => {
    const lista = [
      { estadoUi: { tono: 'vigente' }, fechaLimite: '2026-12-01' },
      { estadoUi: { tono: 'vencido' }, fechaLimite: '2026-11-01' },
      { estadoUi: { tono: 'proximo' }, fechaLimite: '2026-11-20' },
      { estadoUi: { tono: 'proximo' }, fechaLimite: '2026-11-15' },
      { estadoUi: { tono: 'desconocido' } },
      { estadoUi: { tono: 'vigente' } },
    ]
    expect(lista.sort(ordenarPorUrgencia).map((r) => `${r.estadoUi.tono}${r.fechaLimite ? ':' + r.fechaLimite : ''}`)).toEqual([
      'vencido:2026-11-01',
      'proximo:2026-11-15',
      'proximo:2026-11-20',
      'vigente',
      'vigente:2026-12-01',
      'desconocido',
    ])
  })
})

describe('validarRecordatorio', () => {
  const vehiculo = { odometroActual: 30000 }

  it('acepta un recordatorio por fecha completo', () => {
    const form = { ...formVacio('v1'), titulo: 'Renovar seguro', fecha: '2026-12-01' }
    expect(validarRecordatorio(form, { vehiculoDestino: vehiculo, hoy: '2026-11-12' })).toEqual({})
  })

  it('pide vehículo, título y fecha válidos', () => {
    expect(validarRecordatorio(formVacio(''), { hoy: '2026-11-12' })).toEqual({
      vehiculoId: expect.any(String),
      titulo: expect.stringMatching(/Escribe qué hay que hacer/),
      fecha: expect.stringMatching(/Elige la fecha/),
    })
    const pasada = { ...formVacio('v1'), titulo: 'x'.repeat(121), fecha: '2026-11-01' }
    expect(validarRecordatorio(pasada, { hoy: '2026-11-12' })).toEqual({
      titulo: 'Usa máximo 120 caracteres.',
      fecha: 'La fecha ya pasó; elige hoy o una fecha futura.',
    })
  })

  it('valida el kilometraje contra el odómetro', () => {
    const base = { ...formVacio('v1'), titulo: 'Aceite', tipo: 'kilometraje' }
    expect(validarRecordatorio({ ...base, kilometraje: '' }, { vehiculoDestino: vehiculo }).kilometraje).toMatch(/sin decimales/)
    expect(validarRecordatorio({ ...base, kilometraje: '10.5' }, { vehiculoDestino: vehiculo }).kilometraje).toMatch(/sin decimales/)
    expect(validarRecordatorio({ ...base, kilometraje: '20000' }, { vehiculoDestino: vehiculo }).kilometraje).toBe(
      'Debe ser mayor al kilometraje actual del vehículo (30,000 km).'
    )
    expect(validarRecordatorio({ ...base, kilometraje: '35000' }, { vehiculoDestino: vehiculo })).toEqual({})
    expect(validarRecordatorio({ ...base, kilometraje: '100' })).toEqual({})
  })
})
