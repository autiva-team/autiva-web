import { useEffect, useState } from 'react'
import { obtenerVehiculo, obtenerResumenVehiculo } from './vehiculosApi'
import Icon from '../../components/Icons'
import Alerta from '../../components/Alerta'
import { useAviso } from '../../components/Aviso'
import './VehiculoDetallePage.css'

export default function VehiculoDetallePage({
  vehiculoId,
  foto,
  onVolver,
  onMarcarActivo,
  onActualizarOdometro,
  onRegistrarCarga,
  onEditar,
  onIrARecordatorios,
}) {
  const { avisar } = useAviso()
  const [vehiculo, setVehiculo] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [odometro, setOdometro] = useState('')
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    if (!vehiculoId) return
    void (async () => {
      setCargando(true)
      setError('')
      try {
        const [datosVehiculo, datosResumen] = await Promise.all([
          obtenerVehiculo(vehiculoId),
          obtenerResumenVehiculo(vehiculoId).catch(() => null),
        ])
        setVehiculo(datosVehiculo)
        setResumen(datosResumen)
        setOdometro(String(datosVehiculo.odometroActual ?? ''))
      } catch {
        setError('No pudimos cargar este vehículo.')
      } finally {
        setCargando(false)
      }
    })()
  }, [vehiculoId])

  if (cargando) {
    return (
      <div className="detalle-page contenedor" aria-busy="true" aria-label="Cargando vehículo">
        <section className="skeleton-tarjeta detalle-skeleton-banner">
          <span className="skeleton skeleton-linea" style={{ width: '38%', height: 26 }} />
          <span className="skeleton skeleton-linea" style={{ width: '55%' }} />
          <span className="skeleton skeleton-linea" style={{ width: '30%' }} />
        </section>
        <section className="skeleton-tarjeta">
          <span className="skeleton skeleton-linea" style={{ width: '26%', height: 18 }} />
          <div className="detalle-grid">
            {Array.from({ length: 6 }).map((_, indice) => (
              <span key={indice} className="skeleton skeleton-linea" />
            ))}
          </div>
        </section>
        <section className="skeleton-tarjeta">
          <span className="skeleton skeleton-linea" style={{ width: '26%', height: 18 }} />
          <div className="detalle-resumen-grid">
            {Array.from({ length: 3 }).map((_, indice) => (
              <span key={indice} className="skeleton detalle-stat-skeleton" />
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (error || !vehiculo) {
    return (
      <div className="detalle-page contenedor">
        <section className="page-head">
          <div>
            <p className="eyebrow">Expediente del vehículo</p>
            <h1>Vehículo no disponible</h1>
          </div>
        </section>
        <Alerta tipo="error" titulo="No pudimos cargar este vehículo">
          Puede que la conexión se haya interrumpido o que el vehículo ya no exista en tu
          expediente. Revisa tu conexión e inténtalo de nuevo, o vuelve a la lista de tus
          vehículos.
        </Alerta>
        <div className="detalle-error-acciones">
          <button type="button" className="btn btn--secundario" onClick={onVolver}>
            <Icon name="chevron-izquierda" size={16} />
            Volver a mis vehículos
          </button>
        </div>
      </div>
    )
  }

  const odometroActual = Number(vehiculo.odometroActual || vehiculo.kilometrajeInicial || 0)

  const guardarOdometro = (evento) => {
    evento.preventDefault()
    const valor = Number(odometro)
    if (!Number.isInteger(valor) || valor < 0) {
      avisar('Ingresa el odómetro en kilómetros, sin decimales.', 'error')
      return
    }
    if (valor < odometroActual) {
      avisar(`El odómetro no puede ser menor al actual (${odometroActual.toLocaleString('es-MX')} km).`, 'error')
      return
    }
    onActualizarOdometro(vehiculo.id, valor)
    setEditando(false)
  }

  return (
    <div className="detalle-page contenedor">
      <section className="page-head">
        <div>
          <p className="eyebrow">Expediente del vehículo</p>
          <h1>
            {vehiculo.marca} {vehiculo.modelo}
          </h1>
          <p className="page-subtitulo">
            {vehiculo.placas} · {vehiculo.anio} · {vehiculo.color || 'Sin color'}
          </p>
        </div>
        <div className="page-head-acciones">
          {onEditar && (
            <button type="button" className="btn btn--secundario" onClick={() => onEditar(vehiculo.id)}>
              <Icon name="editar" size={16} />
              Editar
            </button>
          )}
          <button type="button" className="btn btn--fantasma" onClick={onVolver}>
            <Icon name="chevron-izquierda" size={16} />
            Volver
          </button>
        </div>
      </section>

      <section className="detalle-banner tarjeta">
        {foto ? (
          <img src={foto} alt={`Foto de ${vehiculo.marca} ${vehiculo.modelo}`} className="detalle-foto-grande" />
        ) : (
          <span className="detalle-icono-grande icono-tono tono-azul" aria-hidden="true">
            <Icon name="car" size={34} />
          </span>
        )}
        <div className="detalle-banner-info">
          <div className="detalle-estado-row">
            <span className={String(vehiculo.estatus).toLowerCase() === 'en taller' ? 'punto-amarillo' : 'punto-verde'} aria-hidden="true" />
            <strong className={String(vehiculo.estatus).toLowerCase() === 'en taller' ? 'texto-aviso' : 'texto-exito'}>
              <span className="capitalizar-primera">{vehiculo.estatus || 'activo'}</span>
            </strong>
          </div>
          <p className="detalle-banner-odometro">
            <Icon name="odometro" size={18} />
            <span>
              {odometroActual.toLocaleString('es-MX')} <small>km recorridos</small>
            </span>
          </p>
        </div>
        {vehiculo.esPrincipal && <span className="badge badge--primario detalle-badge">Principal</span>}
      </section>

      <section className="detalle-card tarjeta" aria-labelledby="titulo-info">
        <h2 id="titulo-info">Información del vehículo</h2>
        <div className="detalle-grid">
          <div>
            <span>Marca</span>
            <strong>{vehiculo.marca}</strong>
          </div>
          <div>
            <span>Modelo</span>
            <strong>{vehiculo.modelo}</strong>
          </div>
          <div>
            <span>Año</span>
            <strong>{vehiculo.anio}</strong>
          </div>
          <div>
            <span>Placas</span>
            <strong>{vehiculo.placas}</strong>
          </div>
          <div>
            <span>Color</span>
            <strong>{vehiculo.color || 'Sin color'}</strong>
          </div>
          <div>
            <span>Km inicial</span>
            <strong>{Number(vehiculo.kilometrajeInicial || 0).toLocaleString('es-MX')} km</strong>
          </div>
          <div>
            <span>Odómetro actual</span>
            <strong>{odometroActual.toLocaleString('es-MX')} km</strong>
          </div>
          <div>
            <span>Principal</span>
            <strong>{vehiculo.esPrincipal ? 'Sí' : 'No'}</strong>
          </div>
          <div>
            <span>Registrado</span>
            <strong>{vehiculo.creadoEn ? new Date(vehiculo.creadoEn).toLocaleDateString('es-MX') : '—'}</strong>
          </div>
        </div>
      </section>

      {resumen && (
        <section className="detalle-card tarjeta" aria-labelledby="titulo-resumen">
          <div className="detalle-resumen-header">
            <h2 id="titulo-resumen">Resumen del expediente</h2>
            <span className="badge">Actividad</span>
          </div>

          <div className="detalle-resumen-grid">
            <div className="detalle-stat-box">
              <span className="icono-tono tono-azul" aria-hidden="true">
                <Icon name="fuel" size={20} />
              </span>
              <div>
                <span className="detalle-stat-label">Cargas de combustible</span>
                <strong>{resumen.totalCargas ?? 0}</strong>
                <small>
                  {resumen.ultimaCarga
                    ? `Última: ${new Date(resumen.ultimaCarga).toLocaleDateString('es-MX')}`
                    : 'Sin cargas'}
                </small>
              </div>
            </div>

            <div className="detalle-stat-box">
              <span className="icono-tono tono-violeta" aria-hidden="true">
                <Icon name="wrench" size={20} />
              </span>
              <div>
                <span className="detalle-stat-label">Servicios realizados</span>
                <strong>{resumen.totalServicios ?? 0}</strong>
                <small>
                  {resumen.ultimoServicio
                    ? `Último: ${new Date(`${resumen.ultimoServicio}T00:00:00`).toLocaleDateString('es-MX')}`
                    : 'Sin servicios'}
                </small>
              </div>
            </div>

            <div className="detalle-stat-box">
              <span className="icono-tono tono-ambar" aria-hidden="true">
                <Icon name="bell" size={20} />
              </span>
              <div>
                <span className="detalle-stat-label">Recordatorios pendientes</span>
                <strong>{resumen.totalRecordatoriosPendientes ?? 0}</strong>
                <small>
                  {(resumen.totalRecordatoriosPendientes ?? 0) > 0 ? 'Requieren atención' : 'Todo al día'}
                </small>
              </div>
            </div>
          </div>

          {resumen.proximoRecordatorio && (
            <div className="detalle-proximo-recordatorio">
              <span className="icono-tono tono-ambar" aria-hidden="true">
                <Icon name="calendario" size={18} />
              </span>
              <div>
                <span>Próximo recordatorio</span>
                <strong>{resumen.proximoRecordatorio.titulo}</strong>
                <p>
                  {resumen.proximoRecordatorio.fechaLimite
                    ? `Fecha límite: ${new Date(`${resumen.proximoRecordatorio.fechaLimite}T00:00:00`).toLocaleDateString('es-MX')}`
                    : `Kilometraje meta: ${Number(resumen.proximoRecordatorio.kmObjetivo).toLocaleString('es-MX')} km`}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="detalle-acciones" aria-label="Acciones del vehículo">
        <button type="button" className="btn btn--primario" onClick={() => onRegistrarCarga(vehiculo.id)}>
          <Icon name="fuel" size={18} />
          Registrar carga
        </button>

        {editando ? (
          <form className="odometro-edicion" onSubmit={guardarOdometro}>
            <label>
              Nuevo odómetro (km)
              <input
                type="number"
                min={odometroActual}
                value={odometro}
                onChange={(e) => setOdometro(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn btn--primario btn--sm">
              Guardar odómetro
            </button>
            <button type="button" className="btn btn--secundario btn--sm" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn--secundario" onClick={() => setEditando(true)}>
            <Icon name="odometro" size={16} />
            Actualizar odómetro
          </button>
        )}

        {!vehiculo.esPrincipal && (
          <button type="button" className="btn btn--secundario" onClick={() => onMarcarActivo(vehiculo.id)}>
            <Icon name="check-circulo" size={16} />
            Marcar como principal
          </button>
        )}

        {onIrARecordatorios && (
          <button type="button" className="btn btn--sutil" onClick={() => onIrARecordatorios(vehiculo.id)}>
            <Icon name="calendario" size={16} />
            Ver o programar recordatorios
          </button>
        )}
      </section>
    </div>
  )
}
