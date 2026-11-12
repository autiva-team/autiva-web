import { describe, expect, it } from 'vitest'
import { anioVehiculo, colorVehiculo, detalleVehiculo, nombreVehiculo, placasVehiculo, unirDatos } from './vehiculo'

describe('unirDatos', () => {
  it('omite partes vacías y no deja separadores sueltos', () => {
    expect(unirDatos(['HGO-123-A', '', null, undefined, '  ', 'Gris'])).toBe('HGO-123-A · Gris')
    expect(unirDatos(['', null])).toBe('')
    expect(unirDatos(['Nissan', 'Versa'], ' ')).toBe('Nissan Versa')
  })
})

describe('datos del vehículo', () => {
  it('lee año, color y placas, ignorando valores vacíos', () => {
    expect(anioVehiculo({ anio: 2020 })).toBe('2020')
    expect(anioVehiculo({ año: '2019' })).toBe('2019')
    expect(anioVehiculo({ anioModelo: 2018 })).toBe('2018')
    expect(anioVehiculo({ anio: 0 })).toBe('')
    expect(anioVehiculo({})).toBe('')
    expect(anioVehiculo(null)).toBe('')
    expect(colorVehiculo({ color: ' Gris ' })).toBe('Gris')
    expect(colorVehiculo({ color: null })).toBe('')
    expect(placasVehiculo({ placas: 'BC1-RC1' })).toBe('BC1-RC1')
  })

  it('arma la línea secundaria sin duplicar ni dejar huecos', () => {
    const versa = { placas: 'HGO-123-A', anio: null, color: '' }
    expect(detalleVehiculo(versa)).toBe('HGO-123-A')
    expect(detalleVehiculo(versa, { sinPlacas: true })).toBe('')
    expect(detalleVehiculo({ placas: 'X', anio: 2020, color: 'Rojo' })).toBe('X · 2020 · Rojo')
    expect(detalleVehiculo({ placas: 'X', anio: 2020, color: 'Rojo' }, { sinPlacas: true })).toBe('2020 · Rojo')
  })

  it('arma el nombre con o sin placas', () => {
    expect(nombreVehiculo({ marca: 'Nissan', modelo: 'Versa', placas: 'HGO-123-A' })).toBe('Nissan Versa · HGO-123-A')
    expect(nombreVehiculo({ marca: 'Nissan', modelo: 'Versa', placas: '' })).toBe('Nissan Versa')
    expect(nombreVehiculo({ marca: 'Nissan', modelo: 'Versa', placas: 'X' }, { conPlacas: false })).toBe('Nissan Versa')
    expect(nombreVehiculo(undefined)).toBe('')
  })
})
