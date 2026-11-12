import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('./suscripcion', () => ({
  obtenerSuscripcionActual: vi.fn(),
  pushCompatible: vi.fn(() => true),
  suscribirPush: vi.fn(),
  desuscribirPush: vi.fn(),
  obtenerClavePublicaVapid: vi.fn(),
}))

import { desuscribirPush, obtenerClavePublicaVapid, obtenerSuscripcionActual, suscribirPush } from './suscripcion'
import { usePush } from './usePush'

beforeEach(() => {
  vi.mocked(obtenerSuscripcionActual).mockReset().mockResolvedValue(null)
  vi.mocked(suscribirPush).mockReset()
  vi.mocked(desuscribirPush).mockReset()
  vi.mocked(obtenerClavePublicaVapid).mockReset().mockResolvedValue('clave')
})

describe('usePush', () => {
  it('indica si el servidor tiene clave VAPID para suscribir', async () => {
    const { result } = renderHook(() => usePush())
    await waitFor(() => expect(result.current.servidorListo).toBe(true))
  })

  it('marca el servidor como no listo si la clave está vacía o falla', async () => {
    vi.mocked(obtenerClavePublicaVapid).mockResolvedValueOnce('')
    const vacia = renderHook(() => usePush())
    await waitFor(() => expect(vacia.result.current.servidorListo).toBe(false))

    vi.mocked(obtenerClavePublicaVapid).mockRejectedValueOnce(new Error('sin red'))
    const conError = renderHook(() => usePush())
    await waitFor(() => expect(conError.result.current.servidorListo).toBe(false))
  })

  it('detecta una suscripción existente al iniciar', async () => {
    vi.mocked(obtenerSuscripcionActual).mockResolvedValue({ endpoint: 'x' })
    const { result } = renderHook(() => usePush())
    await waitFor(() => expect(result.current.activa).toBe(true))
    expect(result.current.compatible).toBe(true)
  })

  it('ignora errores al leer la suscripción', async () => {
    vi.mocked(obtenerSuscripcionActual).mockRejectedValue(new Error('sin SW'))
    const { result } = renderHook(() => usePush())
    await waitFor(() => expect(obtenerSuscripcionActual).toHaveBeenCalled())
    expect(result.current.activa).toBe(false)
  })

  it('activa las notificaciones y avisa el resultado', async () => {
    vi.mocked(suscribirPush).mockResolvedValue({})
    const { result } = renderHook(() => usePush())
    await act(() => result.current.activar())
    expect(result.current.activa).toBe(true)
    expect(result.current.error).toBe(false)
    expect(result.current.mensaje).toMatch(/Notificaciones activadas/)
    act(() => result.current.limpiar())
    expect(result.current.mensaje).toBe('')
  })

  it('muestra el mensaje amigable o uno con solución si falla', async () => {
    const { result } = renderHook(() => usePush())

    vi.mocked(suscribirPush).mockRejectedValueOnce(Object.assign(new Error('Bloqueaste las notificaciones.'), { amigable: true }))
    await act(() => result.current.activar())
    expect(result.current.error).toBe(true)
    expect(result.current.mensaje).toBe('Bloqueaste las notificaciones.')

    vi.mocked(suscribirPush).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await act(() => result.current.activar())
    expect(result.current.mensaje).toMatch(/No se pudo activar las notificaciones\. Revisa tu conexión/)
    expect(result.current.cargando).toBe(false)
  })

  it('desactiva las notificaciones y maneja errores', async () => {
    vi.mocked(obtenerSuscripcionActual).mockResolvedValue({ endpoint: 'x' })
    const { result } = renderHook(() => usePush())
    await waitFor(() => expect(result.current.activa).toBe(true))

    vi.mocked(desuscribirPush).mockRejectedValueOnce(Object.assign(new Error('Error 500'), { status: 500 }))
    await act(() => result.current.desactivar())
    expect(result.current.error).toBe(true)
    expect(result.current.activa).toBe(true)

    vi.mocked(desuscribirPush).mockResolvedValueOnce()
    await act(() => result.current.desactivar())
    expect(result.current.activa).toBe(false)
    expect(result.current.error).toBe(false)
    expect(result.current.mensaje).toMatch(/desactivadas/)
  })
})
