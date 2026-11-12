import { useEffect, useState } from 'react'
import Icon from '../../components/Icons'
import Alerta from '../../components/Alerta'
import Spinner from '../../components/Spinner'
import EstadoVacio from '../../components/EstadoVacio'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import Proximamente from '../../components/Proximamente'
import { obtenerRendimiento } from '../cargas/cargasApi'
import { obtenerResumenVehiculo } from '../vehiculos/vehiculosApi'
import { mensajeError } from '../../utils/mensajes'
import './EstadisticasPage.css'

function numero(valor) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : null
}

// La API devuelve 0 cuando aún no hay datos suficientes: se trata como «sin dato».
function positivo(valor) {
  const n = numero(valor)
  return n != null && n > 0 ? n : null
}

function moneda(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
}

function Indicador({ icono, tono, etiqueta, valor, detalle }) {
  return (
    <article className="estadistica-kpi tarjeta">
      <span className={`icono-tono ${tono}`} aria-hidden="true">
        <Icon name={icono} size={20} />
      </span>
      <span className="estadistica-kpi-label">{etiqueta}</span>
      <strong className="estadistica-kpi-valor cifra">{valor}</strong>
      {detalle && <span className="estadistica-kpi-detalle">{detalle}</span>}
    </article>
  )
}

/**
 * Estadísticas del vehículo con datos reales de la API:
 * - GET /api/vehiculos/{id}/cargas/rendimiento
 * - GET /api/vehiculos/{id}/resumen
 */
export default function EstadisticasPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo }) {
  const [vehiculoElegidoId, setVehiculoElegidoId] = useState(vehiculoId || '')
  const vehiculoActualId = vehiculoElegidoId || vehiculos.find((v) => v.esPrincipal)?.id || vehiculos[0]?.id || ''
  const [rendimiento, setRendimiento] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!vehiculoActualId) return undefined
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const [datosRendimiento, datosResumen] = await Promise.all([
          obtenerRendimiento(vehiculoActualId),
          obtenerResumenVehiculo(vehiculoActualId),
        ])
        if (!vigente) return
        setRendimiento(datosRendimiento)
        setResumen(datosResumen)
      } catch (err) {
        if (vigente) setError(mensajeError(err, 'cargar las estadísticas'))
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [vehiculoActualId, intento])

  const cambiarVehiculo = (id) => {
    setVehiculoElegidoId(id)
    onSeleccionarVehiculo?.(id)
  }

  if (vehiculos.length === 0) {
    return (
      <div className="estadisticas-page contenedor">
        <EncabezadoPagina titulo="Estadísticas" descripcion="Rendimiento y costos de tu vehículo." />
        <EstadoVacio
          icono="chart"
          titulo="Primero registra un vehículo"
          texto="Las estadísticas se calculan con las cargas y servicios de cada vehículo."
        />
      </div>
    )
  }

  const promedio = positivo(rendimiento?.rendimientoPromedioKml)
  const variacion = promedio != null ? numero(rendimiento?.variacionMesAnteriorPorcentaje) : null
  const autonomia = positivo(rendimiento?.autonomiaEstimadaKm)
  const totalCargas = numero(rendimiento?.totalCargas) ?? 0

  return (
    <div className="estadisticas-page contenedor">
      <EncabezadoPagina titulo="Estadísticas" descripcion="Rendimiento y costos de tu vehículo, calculados con tus registros.">
        {vehiculos.length > 1 && (
          <label className="mes-selector">
            <span>Vehículo</span>
            <select
              className="selector-vehiculo"
              value={vehiculoActualId}
              onChange={(e) => cambiarVehiculo(e.target.value)}
            >
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {[`${v.marca} ${v.modelo}`, v.placas].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
          </label>
        )}
      </EncabezadoPagina>

      {error && (
        <Alerta
          tipo="error"
          titulo="No pudimos cargar las estadísticas"
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
          Calculando estadísticas…
        </p>
      ) : !error && (
        <>
          <section className="seccion" aria-labelledby="titulo-combustible">
            <div className="seccion-head">
              <h2 id="titulo-combustible">Combustible</h2>
            </div>
            {totalCargas === 0 ? (
              <p className="texto-secundario">
                Aún no hay cargas registradas. Registra al menos dos con «Llené el tanque» para calcular tu rendimiento.
              </p>
            ) : (
              <div className="estadisticas-kpis">
                <Indicador
                  icono="fuel"
                  tono={promedio != null ? "tono-verde" : "tono-azul"}
                  etiqueta="Rendimiento promedio"
                  valor={promedio != null ? `${promedio.toFixed(1)} km/L` : '—'}
                  detalle={promedio != null ? 'Promedio de tus cargas' : 'Se calcula a partir de la segunda carga con tanque lleno'}
                />
                <Indicador
                  icono="chart"
                  tono={variacion == null || variacion === 0 ? 'tono-azul' : variacion > 0 ? 'tono-verde' : 'tono-rojo'}
                  etiqueta="Vs. mes anterior"
                  valor={variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)} %` : '—'}
                  detalle={
                    variacion == null
                      ? 'Necesita cargas en este mes y en el anterior'
                      : variacion > 0
                        ? 'Tu rendimiento mejoró'
                        : variacion < 0
                          ? 'Tu rendimiento bajó'
                          : 'Sin cambios'
                  }
                />
                <Indicador
                  icono="wallet"
                  tono="tono-azul"
                  etiqueta="Gasto en combustible este mes"
                  valor={moneda(rendimiento?.gastoMesActual)}
                />
                <Indicador
                  icono="car"
                  tono="tono-azul"
                  etiqueta="Autonomía estimada"
                  valor={autonomia != null ? `${Math.round(autonomia).toLocaleString('es-MX')} km` : '—'}
                  detalle={autonomia != null ? 'Con el tanque lleno' : 'Requiere la capacidad del tanque'}
                />
              </div>
            )}
          </section>

          <section className="seccion" aria-labelledby="titulo-expediente">
            <div className="seccion-head">
              <h2 id="titulo-expediente">Expediente</h2>
            </div>
            <div className="estadisticas-kpis">
              <Indicador icono="fuel" tono="tono-azul" etiqueta="Cargas registradas" valor={totalCargas.toLocaleString('es-MX')} />
              <Indicador
                icono="wrench"
                tono="tono-azul"
                etiqueta="Servicios registrados"
                valor={(numero(resumen?.totalServicios) ?? 0).toLocaleString('es-MX')}
              />
              <Indicador
                icono="bell"
                tono={(numero(resumen?.totalRecordatoriosPendientes) ?? 0) > 0 ? 'tono-ambar' : 'tono-verde'}
                etiqueta="Recordatorios pendientes"
                valor={(numero(resumen?.totalRecordatoriosPendientes) ?? 0).toLocaleString('es-MX')}
              />
            </div>
          </section>
        </>
      )}

      <div className="seccion">
        <Proximamente
          icono="chart"
          titulo="Tendencias por mes"
          texto="Pronto verás gráficas del costo operativo y del rendimiento mes a mes, y el costo por kilómetro."
          incluira={['Costo operativo mensual', 'Rendimiento km/L a lo largo del tiempo', 'Costo por kilómetro']}
        />
      </div>
    </div>
  )
}
