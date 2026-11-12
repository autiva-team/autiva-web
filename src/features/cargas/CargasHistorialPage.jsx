import { useEffect, useState } from 'react'
import { obtenerHistorialCargas, obtenerCarga, obtenerRendimiento } from './cargasApi'
import Icon from '../../components/Icons'
import Modal from '../../components/Modal'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import { useAviso } from '../../components/Aviso'
import './CargasHistorialPage.css'

function numero(valor) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : 0
}

function extraerRendimiento(datos) {
  if (!datos) return null
  if (Array.isArray(datos)) {
    const valores = datos
      .map((item) => numero(item?.rendimientoKml ?? item?.valor))
      .filter((valor) => valor > 0)
    if (valores.length === 0) return null
    return valores.reduce((total, valor) => total + valor, 0) / valores.length
  }

  const candidatos = [
    datos.rendimientoPromedioKml,
    datos.rendimientoKml,
    datos.promedioKml,
    datos.rendimientoPromedio,
    datos.promedio,
  ]
  const valor = candidatos.map(numero).find((numeroValido) => numeroValido > 0)
  return valor || null
}

function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  })
}

export default function CargasHistorialPage({
  vehiculos = [],
  vehiculoId,
  onSeleccionarVehiculo,
  onRegistrarCarga,
  onEditarCarga,
}) {
  const { avisar } = useAviso()
  const [vehiculoActual, setVehiculoActual] = useState(vehiculoId || vehiculos[0]?.id || '')
  const [pagina, setPagina] = useState(1)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [datos, setDatos] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [rendimientoApi, setRendimientoApi] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!vehiculoActual) return undefined
    let activo = true
    void (async () => {
      setCargando(true)
      setError('')
      try {
        const historial = await obtenerHistorialCargas(
          vehiculoActual,
          pagina,
          10,
          desde || undefined,
          hasta || undefined
        )
        if (!activo) return
        setDatos(historial)
      } catch {
        if (!activo) return
        setError('No pudimos cargar el historial de cargas.')
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [vehiculoActual, pagina, desde, hasta, intento])

  useEffect(() => {
    if (!vehiculoActual) return undefined
    let activo = true
    obtenerRendimiento(vehiculoActual)
      .then((datosRendimiento) => {
        if (activo) setRendimientoApi(datosRendimiento)
      })
      .catch(() => {
        if (activo) setRendimientoApi(null)
      })
    return () => {
      activo = false
    }
  }, [vehiculoActual])

  const verDetalle = async (id) => {
    setCargandoDetalle(true)
    try {
      const detalleCarga = await obtenerCarga(id)
      setDetalle(detalleCarga)
    } catch {
      avisar(
        'No pudimos abrir el detalle de esta carga. Revisa tu conexión e inténtalo de nuevo.',
        'error'
      )
    } finally {
      setCargandoDetalle(false)
    }
  }

  const cambiarVehiculo = (id) => {
    setVehiculoActual(id)
    setPagina(1)
    if (onSeleccionarVehiculo) onSeleccionarVehiculo(id)
  }

  const items = datos?.items || []
  const rendimientosItems = items
    .map((carga) => numero(carga.rendimientoKml))
    .filter((valor) => valor > 0)
  const rendimientoPromedio =
    extraerRendimiento(rendimientoApi) ||
    (rendimientosItems.length > 0
      ? rendimientosItems.reduce((total, valor) => total + valor, 0) / rendimientosItems.length
      : null)
  const mejorRendimiento = rendimientosItems.length > 0 ? Math.max(...rendimientosItems) : null
  const litrosPagina = items.reduce((total, carga) => total + numero(carga.litros), 0)
  const costoPagina = items.reduce((total, carga) => total + numero(carga.costoTotal), 0)
  const tieneFiltros = Boolean(desde || hasta)

  return (
    <div className="cargas-page contenedor">
      <section className="page-head">
        <div>
          <p className="eyebrow">Combustible</p>
          <h1>Historial de cargas</h1>
          <p className="page-subtitulo">
            Cada carga suma al rendimiento de tu vehículo. Filtra por fecha o revisa el detalle.
          </p>
        </div>
        <div className="page-head-acciones">
          {vehiculos.length > 1 && (
            <select
              className="selector-vehiculo"
              value={vehiculoActual}
              onChange={(e) => cambiarVehiculo(e.target.value)}
              aria-label="Vehículo del historial"
            >
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo} · {v.placas}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => onRegistrarCarga(vehiculoActual)}
          >
            <Icon name="plus" size={18} />
            Nueva carga
          </button>
        </div>
      </section>

      <section className="rendimiento-card tarjeta" aria-labelledby="titulo-rendimiento">
        <div className="rendimiento-card-head">
          <h2 id="titulo-rendimiento">Rendimiento del vehículo</h2>
          <span className="rendimiento-nota">
            {rendimientoPromedio ? 'Basado en tus cargas más recientes' : 'Registra cargas para verlo'}
          </span>
        </div>
        <div className="rendimiento-grid">
          <div>
            <span>Rendimiento promedio</span>
            <strong>
              {rendimientoPromedio ? `${rendimientoPromedio.toFixed(1)} km/L` : '—'}
            </strong>
          </div>
          <div>
            <span>Mejor rendimiento</span>
            <strong>{mejorRendimiento ? `${mejorRendimiento.toFixed(1)} km/L` : '—'}</strong>
          </div>
          <div>
            <span>Costo en pantalla</span>
            <strong>{formatearMoneda(costoPagina)}</strong>
          </div>
          <div>
            <span>Litros en pantalla</span>
            <strong>{litrosPagina.toLocaleString('es-MX', { maximumFractionDigits: 2 })} L</strong>
          </div>
          <div>
            <span>Cargas registradas</span>
            <strong>{datos?.totalRegistros ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="filtros-card" aria-label="Filtros de fecha">
        <label>
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value)
              setPagina(1)
            }}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value)
              setPagina(1)
            }}
          />
        </label>
        {tieneFiltros && (
          <button
            type="button"
            className="btn btn--sutil btn--sm"
            onClick={() => {
              setDesde('')
              setHasta('')
              setPagina(1)
            }}
          >
            <Icon name="close" size={14} />
            Quitar filtros
          </button>
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
          Se interrumpió la conexión con el servidor. Tus cargas no se perdieron: revisa tu
          conexión y vuelve a intentarlo.
        </Alerta>
      )}

      {cargando ? (
        <div className="cargas-lista" aria-busy="true" aria-label="Cargando cargas">
          {Array.from({ length: 3 }).map((_, indice) => (
            <div key={indice} className="skeleton-tarjeta carga-card">
              <span className="skeleton skeleton-linea" style={{ width: '30%', height: 18 }} />
              <span className="skeleton skeleton-linea" style={{ width: '45%' }} />
              <span className="skeleton skeleton-linea" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      ) : error && items.length === 0 ? null : items.length > 0 ? (
        <>
          <div className="cargas-lista">
            {items.map((carga) => (
              <article key={carga.id} className="carga-card tarjeta">
                <div className="carga-head">
                  <div className="carga-titulo">
                    <span className="icono-tono tono-azul" aria-hidden="true">
                      <Icon name="fuel" size={18} />
                    </span>
                    <div>
                      <h3>{carga.tipoCombustible}</h3>
                      <p>{new Date(carga.fechaHora).toLocaleString('es-MX')}</p>
                    </div>
                  </div>
                  <div className="carga-head-acciones">
                    {onEditarCarga && (
                      <button
                        type="button"
                        className="btn btn--sutil btn--sm"
                        onClick={() => onEditarCarga(carga.id)}
                      >
                        <Icon name="editar" size={16} />
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--secundario btn--sm"
                      onClick={() => verDetalle(carga.id)}
                      aria-busy={cargandoDetalle}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
                <div className="carga-datos">
                  <div>
                    <span>Litros</span>
                    <strong>{carga.litros}</strong>
                  </div>
                  <div>
                    <span>Costo</span>
                    <strong>{formatearMoneda(carga.costoTotal)}</strong>
                  </div>
                  <div>
                    <span>Precio/L</span>
                    <strong>{formatearMoneda(carga.precioPorLitro)}</strong>
                  </div>
                  <div>
                    <span>Odómetro</span>
                    <strong>{carga.odometro.toLocaleString('es-MX')} km</strong>
                  </div>
                  <div>
                    <span>Km recorridos</span>
                    <strong>{carga.kmRecorridos ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Rendimiento</span>
                    <strong>{carga.rendimientoKml ? `${carga.rendimientoKml} km/L` : '—'}</strong>
                  </div>
                </div>
                {carga.gasolinera && (
                  <p className="carga-extra">
                    <Icon name="buscar" size={14} />
                    {carga.gasolinera}
                  </p>
                )}
              </article>
            ))}
          </div>

          {datos && datos.totalPaginas > 1 && (
            <nav className="paginacion" aria-label="Paginación del historial">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span>
                Página {datos.pagina} de {datos.totalPaginas} · {datos.totalRegistros} registros
              </span>
              <button
                type="button"
                disabled={pagina >= datos.totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      ) : (
        <EstadoVacio
          icono="fuel"
          titulo={tieneFiltros ? 'Sin cargas en estas fechas' : 'Sin cargas registradas'}
          texto={
            tieneFiltros
              ? 'No encontramos cargas entre las fechas seleccionadas. Prueba con un rango más amplio.'
              : 'Registra tu primera carga para empezar a ver el historial y el rendimiento.'
          }
        >
          {tieneFiltros ? (
            <button
              type="button"
              className="btn btn--secundario"
              onClick={() => {
                setDesde('')
                setHasta('')
                setPagina(1)
              }}
            >
              Quitar filtros
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primario"
              onClick={() => onRegistrarCarga(vehiculoActual)}
            >
              <Icon name="plus" size={18} />
              Registrar carga
            </button>
          )}
        </EstadoVacio>
      )}

      {detalle && (
        <Modal titulo="Detalle de carga" onCerrar={() => setDetalle(null)}>
          <div className="detalle-grid">
            <div>
              <span>Tipo</span>
              <strong>{detalle.tipoCombustible}</strong>
            </div>
            <div>
              <span>Fecha</span>
              <strong>{new Date(detalle.fechaHora).toLocaleString('es-MX')}</strong>
            </div>
            <div>
              <span>Litros</span>
              <strong>{detalle.litros}</strong>
            </div>
            <div>
              <span>Costo total</span>
              <strong>{formatearMoneda(detalle.costoTotal)}</strong>
            </div>
            <div>
              <span>Precio/L</span>
              <strong>{formatearMoneda(detalle.precioPorLitro)}</strong>
            </div>
            <div>
              <span>Odómetro</span>
              <strong>{detalle.odometro.toLocaleString('es-MX')} km</strong>
            </div>
            <div>
              <span>Km recorridos</span>
              <strong>{detalle.kmRecorridos ?? '—'}</strong>
            </div>
            <div>
              <span>Rendimiento</span>
              <strong>{detalle.rendimientoKml ? `${detalle.rendimientoKml} km/L` : '—'}</strong>
            </div>
            <div>
              <span>Tanque lleno</span>
              <strong>{detalle.tanqueLleno ? 'Sí' : 'No'}</strong>
            </div>
            {detalle.gasolinera && (
              <div>
                <span>Gasolinera</span>
                <strong>{detalle.gasolinera}</strong>
              </div>
            )}
            {detalle.notas && (
              <div className="ancho-completo">
                <span>Notas</span>
                <strong>{detalle.notas}</strong>
              </div>
            )}
          </div>
          <div className="modal-acciones">
            <button type="button" className="secundario" onClick={() => setDetalle(null)}>
              Cerrar
            </button>
            {onEditarCarga && (
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => {
                  onEditarCarga(detalle.id)
                  setDetalle(null)
                }}
              >
                <Icon name="editar" size={16} />
                Editar carga
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
