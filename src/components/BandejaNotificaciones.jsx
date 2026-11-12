import { useEffect, useState } from 'react'
import Modal from './Modal'
import Icon from './Icons'
import Spinner from './Spinner'
import Alerta from './Alerta'
import { marcarNotificacionLeida, obtenerNotificaciones } from '../push/suscripcion'
import { mensajeError } from '../utils/mensajes'
import { FUNCIONES } from '../config/funciones'

function fechaRelativa(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Bandeja de notificaciones del usuario (GET /api/push/notificaciones).
 * Abrir una notificación la marca como leída (PATCH .../leida).
 * Desde aquí también se activan o desactivan los avisos en este dispositivo.
 */
export default function BandejaNotificaciones(props) {
  if (!FUNCIONES.notificacionesPush) {
    return (
      <Modal titulo="Notificaciones" onCerrar={props.onCerrar} className="bandeja">
        <div className="bandeja-vacia">
          <span className="proximamente-etiqueta">Próximamente</span>
          <p>
            Pronto recibirás aquí, y en tu teléfono, los avisos de tus recordatorios antes de que venzan.
          </p>
        </div>
        <div className="modal-acciones">
          <button type="button" className="btn btn--secundario" onClick={props.onCerrar}>
            Entendido
          </button>
        </div>
      </Modal>
    )
  }
  return <BandejaConectada {...props} />
}

function BandejaConectada({ push, onCerrar, onCambioSinLeer }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
    setCargando(true)
    setError('')
    await obtenerNotificaciones()
      .then((datos) => {
        if (!vigente) return
        const lista = Array.isArray(datos) ? datos : []
        setNotificaciones(lista)
        onCambioSinLeer?.(lista.filter((n) => !n.leida).length)
      })
      .catch((err) => {
        if (vigente) setError(mensajeError(err, 'cargar tus notificaciones'))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [intento, onCambioSinLeer])

  const marcarLeida = async (notificacion) => {
    if (notificacion.leida) return
    // Respuesta inmediata en pantalla; si la API falla se revierte.
    const actualizar = (leida) =>
      setNotificaciones((lista) => {
        const nueva = lista.map((n) => (n.id === notificacion.id ? { ...n, leida } : n))
        onCambioSinLeer?.(nueva.filter((n) => !n.leida).length)
        return nueva
      })
    actualizar(true)
    try {
      await marcarNotificacionLeida(notificacion.id)
    } catch (err) {
      actualizar(false)
      setError(mensajeError(err, 'marcar la notificación como leída'))
    }
  }

  const sinLeer = notificaciones.filter((n) => !n.leida).length

  return (
    <Modal titulo="Notificaciones" onCerrar={onCerrar} className="bandeja">
      {push.compatible && push.servidorListo === false && (
        <p className="bandeja-push bandeja-push--pendiente">
          <span className="proximamente-etiqueta">Próximamente</span>
          Los avisos en tu teléfono se activarán cuando el servidor termine su configuración. Mientras tanto, aquí verás tus notificaciones.
        </p>
      )}

      {push.compatible && push.servidorListo && (
        <div className="bandeja-push">
          <span className={push.activa ? 'icono-tono tono-verde' : 'icono-tono tono-azul'} aria-hidden="true">
            <Icon name="bell" size={20} />
          </span>
          <div>
            <strong>{push.activa ? 'Avisos activos en este dispositivo' : 'Recibe avisos en este dispositivo'}</strong>
            <p>
              {push.activa
                ? 'Te avisaremos antes de cada vencimiento, aunque la app esté cerrada.'
                : 'Te avisamos antes de que venza tu seguro, verificación o servicio.'}
            </p>
          </div>
          <button
            type="button"
            className={push.activa ? 'btn btn--secundario btn--sm' : 'btn btn--primario btn--sm'}
            onClick={push.activa ? push.desactivar : push.activar}
            disabled={push.cargando}
            aria-busy={push.cargando || undefined}
          >
            {push.cargando && <Spinner size={14} />}
            {push.cargando ? 'Procesando…' : push.activa ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}

      {error && (
        <Alerta
          tipo="error"
          titulo="Hubo un problema"
          accion={
            <button type="button" className="btn btn--secundario btn--sm" onClick={() => setIntento((n) => n + 1)}>
              <Icon name="refrescar" size={16} />
              Reintentar
            </button>
          }
        >
          {error}
        </Alerta>
      )}

      {cargando ? (
        <p className="estado-carga" role="status">
          <Spinner size={20} />
          Cargando notificaciones…
        </p>
      ) : notificaciones.length === 0 && !error ? (
        <div className="bandeja-vacia">
          <Icon name="bell" size={28} />
          <p>No tienes notificaciones todavía. Aquí aparecerán los avisos de tus recordatorios.</p>
        </div>
      ) : (
        <>
          <p className="bandeja-resumen" role="status">
            {sinLeer === 0 ? 'Todo leído.' : `${sinLeer} sin leer.`}
          </p>
          <ul className="bandeja-lista">
            {notificaciones.map((notificacion) => (
              <li key={notificacion.id}>
                <button
                  type="button"
                  className={notificacion.leida ? 'bandeja-item' : 'bandeja-item no-leida'}
                  onClick={() => marcarLeida(notificacion)}
                  aria-label={`${notificacion.leida ? '' : 'Sin leer. '}${notificacion.titulo}. ${notificacion.mensaje}${notificacion.leida ? '' : '. Marcar como leída'}`}
                >
                  <span className="bandeja-punto" aria-hidden="true" />
                  <span className="bandeja-texto">
                    <strong>{notificacion.titulo}</strong>
                    <span>{notificacion.mensaje}</span>
                    <small>{fechaRelativa(notificacion.fechaEnvio)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
