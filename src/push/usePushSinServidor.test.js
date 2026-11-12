import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../config/funciones', () => ({ FUNCIONES: { listaRecordatorios: true, notificacionesPush: false } }))
vi.mock('./suscripcion', () => ({
  obtenerSuscripcionActual: vi.fn(() => Promise.resolve(null)),
  pushCompatible: vi.fn(() => true),
  suscribirPush: vi.fn(),
  desuscribirPush: vi.fn(),
  obtenerClavePublicaVapid: vi.fn(() => Promise.resolve('clave')),
}))

import { obtenerClavePublicaVapid } from './suscripcion'
import { usePush } from './usePush'

describe('usePush con las notificaciones desactivadas', () => {
  it('no consulta la clave VAPID y deja el servidor sin confirmar', async () => {
    const { result } = renderHook(() => usePush())
    await waitFor(() => expect(result.current.activa).toBe(false))
    expect(obtenerClavePublicaVapid).not.toHaveBeenCalled()
    expect(result.current.servidorListo).toBeNull()
  })
})
