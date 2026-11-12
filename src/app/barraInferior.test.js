import { describe, expect, it } from 'vitest'
import { barraVisible } from './barraInferior'

const base = { alturaVista: 800, alturaTotal: 3000, visible: true }

describe('barraVisible', () => {
  it('se muestra cerca del inicio de la página', () => {
    expect(barraVisible({ ...base, anterior: 40, actual: 60, visible: false })).toBe(true)
  })

  it('se oculta al desplazarse hacia abajo', () => {
    expect(barraVisible({ ...base, anterior: 300, actual: 340 })).toBe(false)
  })

  it('reaparece al desplazarse hacia arriba', () => {
    expect(barraVisible({ ...base, anterior: 900, actual: 860, visible: false })).toBe(true)
  })

  it('reaparece al llegar al final de la página', () => {
    expect(barraVisible({ ...base, anterior: 2150, actual: 2190, visible: false })).toBe(true)
  })

  it('ignora movimientos mínimos', () => {
    expect(barraVisible({ ...base, anterior: 500, actual: 503, visible: false })).toBe(false)
    expect(barraVisible({ ...base, anterior: 500, actual: 497, visible: true })).toBe(true)
  })
})
