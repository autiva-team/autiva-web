import { useCallback, useEffect, useState } from 'react'
import { desuscribirPush, obtenerClavePublicaVapid, obtenerSuscripcionActual, pushCompatible, suscribirPush } from './suscripcion'
import { mensajeError } from '../utils/mensajes'
import { FUNCIONES } from '../config/funciones'

/**
 * Estado de las notificaciones push de este dispositivo.
 * - activa: hay una suscripción vigente en este navegador.
 * - activar(): pide permiso (tras un clic) y registra la suscripción en la API.
 * - desactivar(): la da de baja en la API y en el navegador.
 */
export function usePush() {
  const [cargando, setCargando] = useState(false)
  const [activa, setActiva] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState(false)
  // null = aún no se sabe; false = el servidor no tiene clave VAPID configurada.
  const [servidorListo, setServidorListo] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerSuscripcionActual()
      .then((suscripcion) => {
        if (vigente) setActiva(Boolean(suscripcion))
      })
      .catch(() => {})
    if (FUNCIONES.notificacionesPush) {
      // GET /api/push/clave-publica: sin clave no se puede suscribir el dispositivo.
      obtenerClavePublicaVapid()
        .then((clave) => {
          if (vigente) setServidorListo(Boolean(clave))
        })
        .catch(() => {
          if (vigente) setServidorListo(false)
        })
    }
    return () => {
      vigente = false
    }
  }, [])

  const activar = useCallback(async () => {
    setCargando(true)
    setMensaje('')
    setError(false)
    try {
      await suscribirPush()
      setActiva(true)
      setMensaje('Notificaciones activadas. Te avisaremos antes de cada vencimiento.')
    } catch (err) {
      setMensaje(err.amigable ? err.message : mensajeError(err, 'activar las notificaciones'))
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  const desactivar = useCallback(async () => {
    setCargando(true)
    setMensaje('')
    setError(false)
    try {
      await desuscribirPush()
      setActiva(false)
      setMensaje('Notificaciones desactivadas en este dispositivo.')
    } catch (err) {
      setMensaje(mensajeError(err, 'desactivar las notificaciones'))
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [])

  const limpiar = useCallback(() => setMensaje(''), [])

  return { compatible: pushCompatible(), servidorListo, activa, activar, desactivar, cargando, mensaje, error, limpiar }
}
