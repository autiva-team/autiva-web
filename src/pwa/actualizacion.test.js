import { describe, expect, it, vi } from 'vitest'
import { recargarAlActualizar } from './actualizacion'

function crearEntorno({ controller = {}, registro = { update: vi.fn() } } = {}) {
  const eventosSw = {}
  const eventosDoc = {}
  const navegador = {
    serviceWorker: {
      controller,
      addEventListener: (nombre, fn) => { eventosSw[nombre] = fn },
      getRegistration: vi.fn(() => Promise.resolve(registro)),
    },
  }
  const ventana = {
    location: { reload: vi.fn() },
    document: {
      visibilityState: 'visible',
      addEventListener: (nombre, fn) => { eventosDoc[nombre] = fn },
    },
  }
  return { navegador, ventana, eventosSw, eventosDoc, registro }
}

describe('recargarAlActualizar', () => {
  it('no hace nada si el navegador no tiene service worker', () => {
    expect(recargarAlActualizar({ ventana: {}, navegador: {} })).toBe(false)
  })

  it('recarga una sola vez cuando una versión nueva reemplaza a la anterior', () => {
    const { navegador, ventana, eventosSw } = crearEntorno()
    expect(recargarAlActualizar({ ventana, navegador })).toBe(true)
    eventosSw.controllerchange()
    eventosSw.controllerchange()
    expect(ventana.location.reload).toHaveBeenCalledTimes(1)
  })

  it('no recarga en la primera visita (sin versión anterior)', () => {
    const { navegador, ventana, eventosSw } = crearEntorno({ controller: null })
    recargarAlActualizar({ ventana, navegador })
    eventosSw.controllerchange()
    expect(ventana.location.reload).not.toHaveBeenCalled()
  })

  it('busca actualizaciones al volver a la app', async () => {
    const { navegador, ventana, eventosDoc, registro } = crearEntorno()
    recargarAlActualizar({ ventana, navegador })
    eventosDoc.visibilitychange()
    await vi.waitFor(() => expect(registro.update).toHaveBeenCalledTimes(1))

    ventana.document.visibilityState = 'hidden'
    eventosDoc.visibilitychange()
    await Promise.resolve()
    expect(registro.update).toHaveBeenCalledTimes(1)
  })

  it('tolera que no haya registro o que la búsqueda falle', async () => {
    const sinRegistro = crearEntorno({ registro: undefined })
    recargarAlActualizar({ ventana: sinRegistro.ventana, navegador: sinRegistro.navegador })
    expect(() => sinRegistro.eventosDoc.visibilitychange()).not.toThrow()

    const conError = crearEntorno()
    conError.navegador.serviceWorker.getRegistration = vi.fn(() => Promise.reject(new Error('sin red')))
    recargarAlActualizar({ ventana: conError.ventana, navegador: conError.navegador })
    expect(() => conError.eventosDoc.visibilitychange()).not.toThrow()
    await Promise.resolve()
  })

  it('usa window y navigator por omisión', () => {
    expect(typeof recargarAlActualizar()).toBe('boolean')
  })
})
