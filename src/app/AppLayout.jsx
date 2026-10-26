import Icon from '../components/Icons'
import './AppLayout.css'

const secciones = {
  principal: 'Inicio',
  vehiculos: 'Mis Vehículos',
  gasolina: 'Gasolina',
  mantenimiento: 'Mantenimiento',
  gastos: 'Gastos',
  recordatorios: 'Recordatorios',
  estadisticas: 'Estadísticas',
  perfil: 'Perfil',
}

const navegacion = [
  { id: 'principal', label: 'Inicio', icon: 'home' },
  { id: 'vehiculos', label: 'Mis Vehículos', icon: 'car' },
  { id: 'gasolina', label: 'Gasolina', icon: 'fuel' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
  { id: 'gastos', label: 'Gastos', icon: 'wallet' },
  { id: 'recordatorios', label: 'Recordatorios', icon: 'bell' },
  { id: 'estadisticas', label: 'Estadísticas', icon: 'chart' },
  { id: 'perfil', label: 'Perfil', icon: 'user' },
]

const navegacionMovil = navegacion.filter((item) =>
  ['principal', 'vehiculos', 'gastos', 'perfil'].includes(item.id)
)

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export default function AppLayout({
  usuario,
  vistaActiva = 'principal',
  onNavegar,
  onNotificaciones,
  pushCargando = false,
  pushMensaje = '',
  pushError = false,
  onCerrarMensaje,
  children,
}) {
  const titulo = secciones[vistaActiva] || 'Inicio'

  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebar-brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>Autiva</strong>
            <span>Expediente vehicular</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navegacion.map((item) => (
            <button
              key={item.id}
              type="button"
              className={vistaActiva === item.id ? 'nav-item activo' : 'nav-item'}
              onClick={() => onNavegar(item.id)}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar avatar-sm">{iniciales(usuario?.nombre)}</span>
            <div>
              <strong>{usuario?.nombre || 'Usuario'}</strong>
              <span>{usuario?.correo}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-brand">Autiva</span>
            <span className="topbar-seccion">{titulo}</span>
          </div>
          <div className="topbar-actions">
            {onNotificaciones && (
              <button
                type="button"
                className="icon-button"
                onClick={onNotificaciones}
                disabled={pushCargando}
                aria-label="Activar notificaciones"
                title="Activar notificaciones"
              >
                <Icon name="bell" size={20} />
              </button>
            )}
            <button
              type="button"
              className="avatar"
              onClick={() => onNavegar('perfil')}
              aria-label="Ir al perfil"
              title="Ir al perfil"
            >
              {iniciales(usuario?.nombre)}
            </button>
          </div>
        </header>

        {pushMensaje && (
          <div className={pushError ? 'toast error' : 'toast'} role="status">
            <span>{pushMensaje}</span>
            {onCerrarMensaje && (
              <button type="button" onClick={onCerrarMensaje} aria-label="Cerrar aviso">
                ×
              </button>
            )}
          </div>
        )}

        <main className="app-body">{children}</main>

        <nav className="bottom-nav" aria-label="Navegación inferior">
          {navegacionMovil.map((item) => (
            <button
              key={item.id}
              type="button"
              className={vistaActiva === item.id ? 'bottom-item activo' : 'bottom-item'}
              onClick={() => onNavegar(item.id)}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.label === 'Mis Vehículos' ? 'Vehículos' : item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}