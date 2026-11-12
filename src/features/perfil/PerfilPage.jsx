import { useState } from 'react'
import Icon from '../../components/Icons'
import ConfirmarDialogo from '../../components/ConfirmarDialogo'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { FUNCIONES } from '../../config/funciones'
import './PerfilPage.css'

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export default function PerfilPage({
  usuario,
  onLogout,
  push,
}) {
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const notificacionesActivas = Boolean(push?.activa)
  const pushCargando = Boolean(push?.cargando)

  // POST /api/push/suscribir o /api/push/desuscribir según el estado actual.
  const alternarNotificaciones = () => {
    if (!push || pushCargando) return
    if (notificacionesActivas) push.desactivar()
    else push.activar()
  }

  const salir = async () => {
    setSaliendo(true)
    await onLogout()
  }

  const expira = usuario?.expiraEn ? new Date(usuario.expiraEn) : null
  const expiraValida = expira && !Number.isNaN(expira.getTime())

  return (
    <div className="perfil-page contenedor">
      <EncabezadoPagina titulo="Perfil" descripcion="Tus datos, tus preferencias y la sesión en este dispositivo." />

      <section className="perfil-card">
        <span className="perfil-avatar">{iniciales(usuario?.nombre)}</span>
        <div className="perfil-info">
          <h2>{usuario?.nombre || 'Usuario'}</h2>
          <p>{usuario?.correo}</p>
          <span className="perfil-badge">
            <Icon name="shield" size={14} />
            Cuenta protegida
          </span>
        </div>
      </section>

      <section className="perfil-bloque">
        <h2>Datos de la cuenta</h2>
        <div className="perfil-datos">
          <div>
            <span>Nombre</span>
            <strong>{usuario?.nombre || '—'}</strong>
          </div>
          <div>
            <span>Correo</span>
            <strong>{usuario?.correo || '—'}</strong>
          </div>
          <div>
            <span>Tipo de cuenta</span>
            <strong>{usuario?.tipoCuenta || 'Personal'}</strong>
          </div>
          <div>
            <span>Sesión válida hasta</span>
            <strong>{expiraValida ? expira.toLocaleDateString('es-MX') : 'Activa'}</strong>
          </div>
        </div>
      </section>

      <section className="perfil-bloque">
        <h2>Preferencias</h2>

        <button
          type="button"
          className="perfil-opcion"
          onClick={alternarNotificaciones}
          disabled={!FUNCIONES.notificacionesPush || !push?.servidorListo || pushCargando || !push?.compatible}
          role="switch"
          aria-checked={notificacionesActivas}
          aria-busy={pushCargando || undefined}
        >
          <span className="opcion-icono tono-violeta">
            <Icon name="bell" size={20} />
          </span>
          <span className="opcion-texto">
            <strong>Avisos en este dispositivo</strong>
            <small>
              {!FUNCIONES.notificacionesPush
                ? 'Próximamente: avisos en tu teléfono antes de cada vencimiento.'
                : push?.servidorListo === false
                  ? 'Próximamente: el servidor está terminando la configuración de avisos.'
                  : push?.servidorListo == null
                    ? 'Comprobando disponibilidad…'
                : !push?.compatible
                ? 'Este navegador no admite notificaciones.'
                : pushCargando
                  ? 'Procesando…'
                  : notificacionesActivas
                    ? 'Activos: te avisaremos antes de cada vencimiento.'
                    : 'Desactivados. Actívalos para no olvidar vencimientos.'}
            </small>
          </span>
          <span className={notificacionesActivas ? 'switch on' : 'switch'} aria-hidden="true">
            <span />
          </span>
        </button>
      </section>

      <section className="perfil-bloque">
        <h2>Cuenta</h2>
        <button type="button" className="perfil-salir" onClick={() => setConfirmarSalida(true)}>
          <Icon name="logout" size={20} />
          Cerrar sesión
        </button>
      </section>

      <p className="perfil-version">Autiva · Expediente digital vehicular · v1.0</p>

      {confirmarSalida && (
        <ConfirmarDialogo
          titulo="¿Cerrar sesión?"
          mensaje="Tus datos quedan guardados en tu cuenta. Para volver a verlos tendrás que iniciar sesión con tu correo y contraseña."
          textoConfirmar="Cerrar sesión"
          textoCancelar="Seguir aquí"
          textoProceso="Cerrando sesión…"
          onConfirmar={salir}
          onCancelar={() => setConfirmarSalida(false)}
          cargando={saliendo}
        />
      )}
    </div>
  )
}
