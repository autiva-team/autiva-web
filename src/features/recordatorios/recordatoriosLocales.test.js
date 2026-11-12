import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calcularEstadoLocal, guardarRecordatorioCreado, leerRecordatoriosCreados } from './recordatoriosLocales'

const hoy = new Date(2026, 10, 12) // 12 de noviembre de 2026

beforeEach(() => {
  localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u1' }))
})

describe('recordatorios creados en el dispositivo', () => {
  it('guarda por usuario, sin duplicar y filtra por vehículo', () => {
    guardarRecordatorioCreado({ id: 'r1', vehiculoId: 'v1', titulo: 'Seguro' })
    guardarRecordatorioCreado({ id: 'r2', vehiculoId: 'v2', titulo: 'Aceite' })
    guardarRecordatorioCreado({ id: 'r1', vehiculoId: 'v1', titulo: 'Seguro (editado)' })
    expect(leerRecordatoriosCreados().map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(leerRecordatoriosCreados('v1')).toEqual([{ id: 'r1', vehiculoId: 'v1', titulo: 'Seguro (editado)' }])

    localStorage.setItem('autiva_usuario', JSON.stringify({ id: 'u2' }))
    expect(leerRecordatoriosCreados()).toEqual([])
  })

  it('ignora respuestas sin id y datos dañados', () => {
    guardarRecordatorioCreado(null)
    guardarRecordatorioCreado({ titulo: 'sin id' })
    expect(leerRecordatoriosCreados()).toEqual([])

    localStorage.setItem('autiva_recordatorios_creados', '{dañado')
    expect(leerRecordatoriosCreados()).toEqual([])
    localStorage.setItem('autiva_recordatorios_creados', '[]')
    expect(leerRecordatoriosCreados()).toEqual([])
    localStorage.setItem('autiva_recordatorios_creados', JSON.stringify({ u1: 'no es lista' }))
    expect(leerRecordatoriosCreados()).toEqual([])
  })

  it('usa un usuario anónimo si no hay sesión válida', () => {
    localStorage.removeItem('autiva_usuario')
    guardarRecordatorioCreado({ id: 'r9', vehiculoId: 'v1' })
    expect(leerRecordatoriosCreados()).toHaveLength(1)
    localStorage.setItem('autiva_usuario', '{dañado')
    expect(leerRecordatoriosCreados()).toHaveLength(1)
  })

  it('no falla si el almacenamiento está lleno', () => {
    const espia = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => guardarRecordatorioCreado({ id: 'r1', vehiculoId: 'v1' })).not.toThrow()
    espia.mockRestore()
  })
})

describe('calcularEstadoLocal', () => {
  it('por fecha: vencido, próximo según la anticipación y al día', () => {
    expect(calcularEstadoLocal({ criterio: 'por_fecha', fechaLimite: '2026-11-10' }, 0, hoy)).toMatchObject({
      diasRestantes: -2,
      estaVencido: true,
      proximoAVencer: false,
      estado: 'pendiente',
    })
    expect(calcularEstadoLocal({ criterio: 'por_fecha', fechaLimite: '2026-11-17', anticipacionDias: 7 }, 0, hoy)).toMatchObject({
      diasRestantes: 5,
      estaVencido: false,
      proximoAVencer: true,
    })
    expect(calcularEstadoLocal({ criterio: 'por_fecha', fechaLimite: '2026-12-31', anticipacionDias: 3 }, 0, hoy)).toMatchObject({
      proximoAVencer: false,
      estaVencido: false,
    })
  })

  it('por kilometraje: vencido al alcanzar la meta y próximo a 500 km', () => {
    expect(calcularEstadoLocal({ criterio: 'por_kilometraje', kmObjetivo: 50000 }, 50000, hoy)).toMatchObject({
      kmRestantes: 0,
      estaVencido: true,
    })
    expect(calcularEstadoLocal({ criterio: 'por_kilometraje', kmObjetivo: 50000 }, 49600, hoy)).toMatchObject({
      kmRestantes: 400,
      proximoAVencer: true,
    })
    expect(calcularEstadoLocal({ criterio: 'por_kilometraje', kmObjetivo: 50000 }, undefined, hoy)).toMatchObject({
      kmRestantes: 50000,
      proximoAVencer: false,
    })
  })

  it('sin datos suficientes queda neutro y respeta el estado recibido', () => {
    expect(calcularEstadoLocal({ criterio: 'otro', estado: 'concluido' }, 0, hoy)).toMatchObject({
      estado: 'concluido',
      estaVencido: false,
      proximoAVencer: false,
    })
    expect(calcularEstadoLocal({ criterio: 'por_fecha' })).toMatchObject({ estaVencido: false })
  })
})
