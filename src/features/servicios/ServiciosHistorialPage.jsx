import { useEffect, useState } from 'react'
import { obtenerHistorialServicios, obtenerServicio } from './serviciosApi'
import Modal from '../../components/Modal'
import Icon from '../../components/Icons'
import { nombreVehiculo } from '../../utils/vehiculo'
import { useAviso } from '../../components/Aviso'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import Spinner from '../../components/Spinner'
import { mensajeError } from '../../utils/mensajes'
import './ServiciosHistorialPage.css'

function numero(valor) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : 0
}

export default function ServiciosHistorialPage({
  vehiculos = [],
  vehiculoId,
  onSeleccionarVehiculo,
  onRegistrarServicio,
}) {
  const [vehiculoActual, setVehiculoActual] = useState(vehiculoId || vehiculos[0]?.id || '')
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const { avisar } = useAviso()

  useEffect(() => {
    if (!vehiculoActual) return
    let activo = true
    void (async () => {
      setCargando(true)
      setError('')
      try {
        const d = await obtenerHistorialServicios(vehiculoActual, pagina, 10)
        if (!activo) return
        setDatos(d)
      } catch (err) {
        if (!activo) return
        setError(mensajeError(err, 'cargar el historial de servicios'))
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => { activo = false }
  }, [vehiculoActual, pagina, intento])

  const verDetalle = async (id) => {
    try {
      const d = await obtenerServicio(id)
      setDetalle(d)
    } catch (err) {
      avisar(mensajeError(err, 'abrir el detalle del servicio'), 'error')
    }
  }

  const cambiarVehiculo = (id) => {
    setVehiculoActual(id)
    setPagina(1)
    if (onSeleccionarVehiculo) onSeleccionarVehiculo(id)
  }

  const items = datos?.items || []
  const vehiculoObjeto = vehiculos.find((vehiculo) => vehiculo.id === vehiculoActual) || null
  const odometroActual = numero(vehiculoObjeto?.odometroActual ?? vehiculoObjeto?.kilometrajeInicial)
  const ultimoServicio = items[0] || null
  const metaProximoKm = numero(ultimoServicio?.metaProximoKm)
  const kmServicio = numero(ultimoServicio?.kilometrajeServicio)
  const avance =
    metaProximoKm > kmServicio
      ? Math.min(100, Math.max(0, ((odometroActual - kmServicio) / (metaProximoKm - kmServicio)) * 100))
      : 0
  const faltanKm = Math.max(0, metaProximoKm - odometroActual)

  return (
    <div className="servicios-page contenedor">
      <section className="page-head">
        <div>
          <h1>Historial de servicios</h1>
          <p>Mantenimiento y servicios realizados.</p>
        </div>
        <div className="page-head-acciones">
          {vehiculos.length > 1 && (
            <select className="selector-vehiculo" value={vehiculoActual} onChange={(e) => cambiarVehiculo(e.target.value)}>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {nombreVehiculo(v)}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="accion-principal compacta" onClick={() => onRegistrarServicio(vehiculoActual)}>
            <Icon name="plus" size={18} />
            Nuevo servicio
          </button>
        </div>
      </section>

      <section className="proximo-servicio-card">
        <div className="proximo-servicio-head">
          <div>
            <span className="proximo-servicio-eyebrow">Próximo mantenimiento</span>
            <h3>
              {metaProximoKm > 0
                ? `${metaProximoKm.toLocaleString('es-MX')} km`
                : ultimoServicio
                  ? 'Sin meta definida'
                  : 'Sin servicios registrados'}
            </h3>
          </div>
          {ultimoServicio && (
            <span className="proximo-servicio-tag">
              Último: {ultimoServicio.tipoServicio} · {ultimoServicio.fecha}
            </span>
          )}
        </div>

        {metaProximoKm > kmServicio ? (
          <>
            <div className="progreso-pista" aria-hidden="true">
              <span className="progreso-relleno" style={{ width: `${avance}%` }} />
            </div>
            <div className="proximo-servicio-pie">
              <span>Odómetro actual: {odometroActual.toLocaleString('es-MX')} km</span>
              <strong className={faltanKm === 0 ? 'texto-peligro' : ''}>
                {faltanKm === 0
                  ? 'Meta alcanzada, agenda el servicio'
                  : `Faltan ${faltanKm.toLocaleString('es-MX')} km`}
              </strong>
            </div>
          </>
        ) : (
          <p className="proximo-servicio-vacio">
            {ultimoServicio
              ? 'Registra una meta de próximo kilometraje al crear o editar un servicio para ver el avance.'
              : 'Cuando registres un servicio con próximo kilometraje verás aquí el avance.'}
          </p>
        )}
      </section>

      {error && (
        <Alerta
          tipo="error"
          titulo="No pudimos cargar el historial"
          accion={
            <button type="button" className="btn btn--secundario btn--sm" onClick={() => setIntento((n) => n + 1)} disabled={cargando}>
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
          Cargando servicios…
        </p>
      ) : error && items.length === 0 ? null : items.length > 0 ? (
        <>
          <div className="servicios-lista">
            {items.map((servicio) => (
              <article key={servicio.id} className="servicio-card">
                <div className="servicio-head">
                  <div>
                    <h2 className="servicio-titulo">{servicio.tipoServicio}</h2>
                    <p>{servicio.fecha} · {servicio.kilometrajeServicio.toLocaleString('es-MX')} km</p>
                  </div>
                  <div className="servicio-head-acciones">
                    <button type="button" className="ficha-btn" onClick={() => verDetalle(servicio.id)}>
                      Ver detalle
                    </button>
                  </div>
                </div>
                <div className="servicio-datos">
                  <div><span>Costo</span><strong>${servicio.costo}</strong></div>
                  {servicio.metaProximoKm && <div><span>Próximo km</span><strong>{servicio.metaProximoKm.toLocaleString('es-MX')} km</strong></div>}
                  {servicio.taller && <div><span>Taller</span><strong>{servicio.taller}</strong></div>}
                  {servicio.folio && <div><span>Folio</span><strong>{servicio.folio}</strong></div>}
                </div>
                {servicio.notas && <p className="servicio-notas">{servicio.notas}</p>}
              </article>
            ))}
          </div>

          <div className="paginacion">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              Anterior
            </button>
            <span>
              Página {datos.pagina} de {datos.totalPaginas} · {datos.totalRegistros} registros
            </span>
            <button type="button" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </>
      ) : (
        <EstadoVacio
          icono="wrench"
          titulo="Sin servicios registrados"
          texto="Anota cada cambio de aceite, afinación o reparación para saber cuándo toca el siguiente."
        >
          <button type="button" className="btn btn--primario" onClick={() => onRegistrarServicio(vehiculoActual)}>
            <Icon name="plus" size={18} />
            Registrar servicio
          </button>
        </EstadoVacio>
      )}

      {detalle && (
        <Modal titulo={'Servicio: ' + (detalle.tipoServicio || 'detalle')} onCerrar={() => setDetalle(null)}>
          <dl className="detalle-grid">
            <div><dt>Fecha</dt><dd>{detalle.fecha}</dd></div>
            <div><dt>Kilometraje</dt><dd>{Number(detalle.kilometrajeServicio).toLocaleString('es-MX')} km</dd></div>
            <div><dt>Costo</dt><dd>{Number(detalle.costo).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd></div>
            {detalle.metaProximoKm && <div><dt>Próximo servicio</dt><dd>{Number(detalle.metaProximoKm).toLocaleString('es-MX')} km</dd></div>}
            {detalle.fechaRetorno && <div><dt>Regreso al taller</dt><dd>{detalle.fechaRetorno}</dd></div>}
            {detalle.taller && <div><dt>Taller</dt><dd>{detalle.taller}</dd></div>}
            {detalle.folio && <div><dt>Folio</dt><dd>{detalle.folio}</dd></div>}
            {detalle.notas && <div className="ancho-completo"><dt>Notas</dt><dd>{detalle.notas}</dd></div>}
          </dl>
          <div className="modal-acciones">
            <button type="button" className="btn btn--secundario" onClick={() => setDetalle(null)}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
