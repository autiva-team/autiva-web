import { useState } from 'react'
import Icon from '../../components/Icons'
import { detalleVehiculo } from '../../utils/vehiculo'
import EstadoVacio from '../../components/EstadoVacio'
import { useAviso } from '../../components/Aviso'
import './VehiculosPage.css'

function odometroDe(vehiculo) {
  const valor = Number(vehiculo?.odometroActual ?? vehiculo?.kilometrajeInicial ?? 0)
  return Number.isFinite(valor) ? valor : 0
}

export default function VehiculosPage({
  vehiculos = [],
  fotos = {},
  cargando = false,
  onRegistrarVehiculo,
  onVerDetalle,
  onMarcarActivo,
  onActualizarOdometro,
  onRegistrarCarga,
  onEditarVehiculo,
}) {
  const { avisar } = useAviso()
  const [editandoId, setEditandoId] = useState(null)
  const [odometro, setOdometro] = useState('')

  const activo = vehiculos.find((v) => v.esPrincipal) || vehiculos[0] || null
  const otros = activo ? vehiculos.filter((v) => v.id !== activo.id) : []

  const iniciarEdicion = (vehiculo) => {
    setEditandoId(vehiculo.id)
    setOdometro(String(odometroDe(vehiculo)))
  }

  const guardarOdometro = (vehiculo) => {
    const valor = Number(odometro)
    const actual = odometroDe(vehiculo)
    if (!Number.isInteger(valor) || valor < 0) {
      avisar('Ingresa el odómetro en kilómetros, sin decimales.', 'error')
      return
    }
    if (valor < actual) {
      avisar(`El odómetro no puede ser menor al actual (${actual.toLocaleString('es-MX')} km).`, 'error')
      return
    }
    onActualizarOdometro(vehiculo.id, valor)
    setEditandoId(null)
    setOdometro('')
  }

  return (
    <div className="vehiculos-page contenedor">
      <section className="page-head">
        <div>
          <p className="eyebrow">Tu flota</p>
          <h1>Mis vehículos</h1>
          <p className="page-subtitulo">
            {vehiculos.length > 0
              ? `${vehiculos.length} vehículo${vehiculos.length === 1 ? '' : 's'} en tu expediente. Elige uno para ver su historial completo.`
              : 'El expediente de cada auto que manejas, en un solo lugar.'}
          </p>
        </div>
        <div className="page-head-acciones">
          <button type="button" className="btn btn--primario" onClick={onRegistrarVehiculo}>
            <Icon name="plus" size={18} />
            Agregar vehículo
          </button>
        </div>
      </section>

      {cargando && vehiculos.length === 0 ? (
        <section aria-label="Cargando vehículos" aria-busy="true">
          <div className="vehiculo-principal skeleton-tarjeta">
            <span className="skeleton principal-foto-skeleton" />
            <div className="principal-info">
              <span className="skeleton skeleton-linea" style={{ width: '45%', height: 22 }} />
              <span className="skeleton skeleton-linea" style={{ width: '30%' }} />
              <span className="skeleton skeleton-linea" style={{ width: '70%' }} />
              <span className="skeleton skeleton-linea" style={{ width: '55%' }} />
            </div>
          </div>
        </section>
      ) : vehiculos.length > 0 ? (
        <>
          {activo && (
            <section className="vehiculo-principal tarjeta" aria-label="Vehículo principal">
              <div className="principal-foto">
                {fotos[activo.id] ? (
                  <img
                    src={fotos[activo.id]}
                    alt={`Foto de ${activo.marca} ${activo.modelo}`}
                    className="principal-foto-img"
                  />
                ) : (
                  <span className="principal-foto-icono" aria-hidden="true">
                    <Icon name="car" size={52} />
                  </span>
                )}
                <span className="badge badge--primario principal-badge">Principal</span>
              </div>

              <div className="principal-info">
                <div className="principal-titulo">
                  <h2>
                    {activo.marca} {activo.modelo}
                  </h2>
                  {/* Las placas ya aparecen en «Placas»: aquí solo año y color, si existen. */}
                  {detalleVehiculo(activo, { sinPlacas: true }) && <p>{detalleVehiculo(activo, { sinPlacas: true })}</p>}
                </div>

                <div className="principal-datos">
                  <div className="dato">
                    <span className="dato-icono" aria-hidden="true">
                      <Icon name="odometro" size={16} />
                    </span>
                    <div>
                      <span>Odómetro</span>
                      <strong>{odometroDe(activo).toLocaleString('es-MX')} km</strong>
                    </div>
                  </div>
                  <div className="dato">
                    <span className="dato-icono" aria-hidden="true">
                      <Icon name="shield" size={16} />
                    </span>
                    <div>
                      <span>Estatus</span>
                      <strong className="capitalizar-primera">{activo.estatus || 'activo'}</strong>
                    </div>
                  </div>
                  <div className="dato">
                    <span className="dato-icono" aria-hidden="true">
                      <Icon name="car" size={16} />
                    </span>
                    <div>
                      <span>Placas</span>
                      <strong>{activo.placas}</strong>
                    </div>
                  </div>
                </div>

                {editandoId === activo.id ? (
                  <form
                    className="odometro-edicion"
                    onSubmit={(evento) => {
                      evento.preventDefault()
                      guardarOdometro(activo)
                    }}
                  >
                    <label>
                      Nuevo odómetro (km)
                      <input
                        type="number"
                        min={odometroDe(activo)}
                        value={odometro}
                        onChange={(e) => setOdometro(e.target.value)}
                        required
                      />
                    </label>
                    <button type="submit" className="btn btn--primario btn--sm">
                      Guardar
                    </button>
                    <button type="button" className="btn btn--secundario btn--sm" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </button>
                  </form>
                ) : null}

                <div className="principal-acciones">
                  <button type="button" className="btn btn--primario" onClick={() => onVerDetalle(activo.id)}>
                    Ver expediente
                    <Icon name="arrow" size={16} />
                  </button>
                  <button type="button" className="btn btn--secundario btn--sm" onClick={() => iniciarEdicion(activo)}>
                    <Icon name="odometro" size={16} />
                    Odómetro
                  </button>
                  <button type="button" className="btn btn--secundario btn--sm" onClick={() => onRegistrarCarga(activo.id)}>
                    <Icon name="fuel" size={16} />
                    Carga
                  </button>
                  {onEditarVehiculo && (
                    <button type="button" className="btn btn--sutil btn--sm" onClick={() => onEditarVehiculo(activo.id)}>
                      <Icon name="editar" size={16} />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {otros.length > 0 && (
            <section className="otros-vehiculos" aria-labelledby="titulo-otros">
              <div className="otros-head">
                <h2 id="titulo-otros">Mis otros vehículos</h2>
                <span className="badge">{otros.length} más</span>
              </div>
              <div className="otros-lista">
                {otros.map((vehiculo) => (
                  <article key={vehiculo.id} className="otro-vehiculo tarjeta">
                    <div className="otro-foto">
                      {fotos[vehiculo.id] ? (
                        <img src={fotos[vehiculo.id]} alt={`Foto de ${vehiculo.marca} ${vehiculo.modelo}`} />
                      ) : (
                        <span className="otro-foto-icono" aria-hidden="true">
                          <Icon name="car" size={26} />
                        </span>
                      )}
                    </div>
                    <div className="otro-info">
                      <h3>
                        {vehiculo.marca} {vehiculo.modelo}
                      </h3>
                      {detalleVehiculo(vehiculo) && <p>{detalleVehiculo(vehiculo)}</p>}
                      <strong>{odometroDe(vehiculo).toLocaleString('es-MX')} km</strong>
                    </div>
                    <div className="otro-acciones">
                      {!vehiculo.esPrincipal && (
                        <button type="button" className="btn btn--secundario btn--sm" onClick={() => onMarcarActivo(vehiculo.id)}>
                          Hacer principal
                        </button>
                      )}
                      <button type="button" className="btn btn--sutil btn--sm" onClick={() => onVerDetalle(vehiculo.id)}>
                        Expediente
                      </button>
                      <button type="button" className="btn btn--sutil btn--sm" onClick={() => onRegistrarCarga(vehiculo.id)}>
                        Carga
                      </button>
                      {onEditarVehiculo && (
                        <button type="button" className="btn btn--sutil btn--sm" onClick={() => onEditarVehiculo(vehiculo.id)}>
                          <Icon name="editar" size={16} />
                          Editar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <EstadoVacio
          icono="car"
          titulo="Aún no tienes vehículos"
          texto="Registra tu primer auto para llevar su historial de cargas, servicios y gastos."
        >
          <button type="button" className="btn btn--primario" onClick={onRegistrarVehiculo}>
            <Icon name="plus" size={18} />
            Registrar vehículo
          </button>
        </EstadoVacio>
      )}
    </div>
  )
}
