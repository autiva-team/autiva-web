import { useState } from 'react'
import { suscribirPush } from './suscripcion'

export function usePush() {
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState(false)

  const activar = async () => {
    setCargando(true)
    setMensaje('')
    setError(false)

    try {
      await suscribirPush()
      setMensaje('Notificaciones activadas correctamente.')
    } catch (err) {
      setMensaje(err.message || 'No se pudieron activar las notificaciones.')
      setError(true)
    } finally {
      setCargando(false)
    }
  }

  const limpiar = () => setMensaje('')

  return { activar, cargando, mensaje, error, limpiar }
}
