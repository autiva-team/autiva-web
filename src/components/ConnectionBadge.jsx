import { useEffect, useState } from 'react'
import { EVENTO_PENDIENTES, contarPendientes } from '../offline/syncQueue'
import './ConnectionBadge.css'

function estadoInicial() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export default function ConnectionBadge() {
  const [enLinea, setEnLinea] = useState(estadoInicial)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine)
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])

  // Cuenta lo que sigue en la cola offline (IndexedDB).
  useEffect(() => {
    let activo = true
    const recontar = () => {
      contarPendientes()
        .then((total) => { if (activo) setPendientes(total) })
        .catch(() => {})
    }
    recontar()
    window.addEventListener(EVENTO_PENDIENTES, recontar)
    return () => {
      activo = false
      window.removeEventListener(EVENTO_PENDIENTES, recontar)
    }
  }, [])

  const textoPendientes =
    pendientes === 1 ? '1 registro pendiente de enviar' : `${pendientes} registros pendientes de enviar`

  let titulo = enLinea ? 'Tienes conexión a internet' : 'Sin conexión: tus cargas y servicios se guardan en el dispositivo'
  if (pendientes > 0) titulo += `. ${textoPendientes}.`

  return (
    <span
      className={enLinea ? 'conexion-badge' : 'conexion-badge offline'}
      role="status"
      title={titulo}
      aria-label={titulo}
    >
      <span className="conexion-dot" aria-hidden="true" />
      {enLinea ? 'En línea' : 'Sin conexión'}
      {pendientes > 0 && <span className="conexion-pendientes"> · {pendientes}</span>}
    </span>
  )
}
