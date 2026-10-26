import Icon from '../../components/Icons'
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
  onActivarPush,
  pushCargando,
}) {
  return (
    <div className="perfil-page">
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
        <h3>Preferencias</h3>

        <button
          type="button"
          className="perfil-opcion"
          onClick={onActivarPush}
          disabled={pushCargando}
        >
          <span className="opcion-icono tono-violeta">
            <Icon name="bell" size={20} />
          </span>
          <span className="opcion-texto">
            <strong>Notificaciones push</strong>
            <small>Recordatorios y avisos de tu vehículo</small>
          </span>
          <span className="opcion-accion">
            {pushCargando ? 'Activando...' : 'Activar'}
          </span>
        </button>

        <div className="perfil-opcion estatica">
          <span className="opcion-icono tono-azul">
            <Icon name="car" size={20} />
          </span>
          <span className="opcion-texto">
            <strong>Vehículo principal</strong>
            <small>Se administra desde Mis Vehículos</small>
          </span>
        </div>

        <div className="perfil-opcion estatica">
          <span className="opcion-icono tono-cian">
            <Icon name="chart" size={20} />
          </span>
          <span className="opcion-texto">
            <strong>Resumen de uso</strong>
            <small>Disponible en Estadísticas</small>
          </span>
        </div>
      </section>

      <section className="perfil-bloque">
        <h3>Cuenta</h3>
        <button type="button" className="perfil-salir" onClick={onLogout}>
          <Icon name="logout" size={20} />
          Cerrar sesión
        </button>
      </section>

      <p className="perfil-version">Autiva · Expediente digital vehicular</p>
    </div>
  )
}
