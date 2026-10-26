import Icon from '../../components/Icons'
import './PrincipalPage.css'

const acciones = [
  {
    id: 'vehiculos',
    icon: 'car',
    titulo: 'Mis Vehículos',
    subtitulo: 'Administra tu expediente',
    tono: 'azul',
  },
  {
    id: 'gasolina',
    icon: 'fuel',
    titulo: 'Gasolina',
    subtitulo: 'Cargas y rendimiento',
    tono: 'cian',
  },
  {
    id: 'mantenimiento',
    icon: 'wrench',
    titulo: 'Mantenimiento',
    subtitulo: 'Servicios programados',
    tono: 'violeta',
  },
  {
    id: 'gastos',
    icon: 'wallet',
    titulo: 'Gastos',
    subtitulo: 'Control de tu dinero',
    tono: 'azul',
  },
  {
    id: 'recordatorios',
    icon: 'bell',
    titulo: 'Recordatorios',
    subtitulo: 'Nada se te olvida',
    tono: 'violeta',
  },
  {
    id: 'estadisticas',
    icon: 'chart',
    titulo: 'Estadísticas',
    subtitulo: 'Histórico y eficiencia',
    tono: 'cian',
  },
]

function primerNombre(nombre = '') {
  return nombre.split(' ').filter(Boolean)[0] || 'conductor'
}

export default function PrincipalPage({
  usuario,
  vehiculos = [],
  fotos = {},
  onNavegar,
  onRegistrarVehiculo,
  instalable = false,
  onInstalar,
}) {
  const vehiculoActivo =
    vehiculos.find((item) => item.esPrincipal) || vehiculos[0] || null
  const totalVehiculos = vehiculos.length
  const fotoActiva = vehiculoActivo ? fotos[vehiculoActivo.id] : ''

  return (
    <div className="dashboard">
      <section className="saludo">
        <div>
          <p className="saludo-eyebrow">Tu expediente digital</p>
          <h2>Hola, {primerNombre(usuario?.nombre)}</h2>
          <p className="saludo-texto">
            {totalVehiculos > 0
              ? `Tienes ${totalVehiculos} vehículo${totalVehiculos === 1 ? '' : 's'} registrado${totalVehiculos === 1 ? '' : 's'}.`
              : 'Todo tu vehículo, en un solo lugar.'}
          </p>
        </div>
        <span className="saludo-icono">
          <Icon name="spark" size={24} />
        </span>
      </section>

      {vehiculoActivo ? (
        <section className="vehiculo-activo" aria-label="Vehículo activo">
          {fotoActiva && (
            <img
              src={fotoActiva}
              alt={`${vehiculoActivo.marca} ${vehiculoActivo.modelo}`}
              className="vehiculo-foto-banner"
            />
          )}

          <div className="vehiculo-head">
            <div>
              <h3>
                {vehiculoActivo.marca} {vehiculoActivo.modelo}
              </h3>
              <div className="vehiculo-meta">
                <span className="placa">{vehiculoActivo.placas}</span>
                <span className="badge-activo">
                  {vehiculoActivo.esPrincipal ? 'Principal' : 'Activo'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="icon-button suave"
              onClick={() => onNavegar('vehiculos')}
              aria-label="Ver vehículos"
            >
              <Icon name="arrow" size={18} />
            </button>
          </div>

          <div className="odometro">
            <div>
              <span className="odometro-label">Odómetro actual</span>
              <strong>
                {Number(
                  vehiculoActivo.odometroActual ?? vehiculoActivo.kilometrajeInicial ?? 0
                ).toLocaleString('es-MX')}{' '}
                <small>km</small>
              </strong>
            </div>
            <span className="odometro-chip">
              <Icon name="car" size={16} />
              {vehiculoActivo.anio}
            </span>
          </div>

          <div className="inspeccion">
            <span className="punto-verde" />
            <span>Inspección vehicular</span>
            <strong>Al día</strong>
          </div>
        </section>
      ) : (
        <section className="vehiculo-vacio">
          <span className="vacio-icono">
            <Icon name="car" size={26} />
          </span>
          <div>
            <h3>Aún no tienes un vehículo</h3>
            <p>Registra tu primer auto para empezar tu expediente digital.</p>
          </div>
          <button type="button" className="accion-principal" onClick={onRegistrarVehiculo}>
            Registrar vehículo
          </button>
        </section>
      )}

      <section className="seccion">
        <div className="seccion-head">
          <h3>Gestión rápida</h3>
          <span className="seccion-tag">Acciones</span>
        </div>
        <div className="grid-acciones">
          {acciones.map((accion) => (
            <button
              key={accion.id}
              type="button"
              className="accion-card"
              onClick={() => onNavegar(accion.id)}
            >
              <span className={`accion-icono tono-${accion.tono}`}>
                <Icon name={accion.icon} size={22} />
              </span>
              <span className="accion-titulo">{accion.titulo}</span>
              <span className="accion-subtitulo">{accion.subtitulo}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="seguro-card">
        <span className="seguro-icono">
          <Icon name="shield" size={24} />
        </span>
        <div>
          <h3>Seguro del vehículo</h3>
          <p>
            {vehiculoActivo
              ? 'Aún no registras tu póliza.'
              : 'Protege tu vehículo con una póliza.'}
          </p>
        </div>
        <button type="button" className="seguro-btn" onClick={() => onNavegar('vehiculos')}>
          Ver
        </button>
      </section>

      <section className="instalar-card">
        <div>
          <h3>Instalar Autiva</h3>
          <p>Agrégala a tu pantalla de inicio para usarla como app, incluso sin conexión.</p>
        </div>
        <button
          type="button"
          className="instalar-btn"
          onClick={onInstalar}
        >
          {instalable ? 'Agregar a pantalla de inicio' : 'Cómo instalar Autiva'}
        </button>
      </section>
    </div>
  )
}
