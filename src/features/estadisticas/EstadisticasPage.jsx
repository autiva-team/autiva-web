import { useRecargaApi } from '../../api/useRecargaApi'
import { useEffect, useState } from 'react'
import Icon from '../../components/Icons'
import Alerta from '../../components/Alerta'
import Spinner from '../../components/Spinner'
import EstadoVacio from '../../components/EstadoVacio'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { obtenerEstadisticas } from './estadisticasApi'
import { GraficaGastos, GraficaRendimiento } from './GraficasEstadisticas'
import { useUnidades } from '../../utils/useUnidades'
import { obtenerRendimiento } from '../cargas/cargasApi'
import { obtenerResumenVehiculo } from '../vehiculos/vehiculosApi'
import { obtenerResumenGastos } from '../gastos/gastosApi'
import { mensajeError } from '../../utils/mensajes'
import './EstadisticasPage.css'

const moneda = (valor) => Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
const periodos = [['1M', '1 mes'], ['3M', '3 meses'], ['6M', '6 meses'], ['1A', '1 año']]

function Indicador({ icono, tono = 'tono-azul', etiqueta, valor, detalle }) {
  return <article className="estadistica-kpi tarjeta"><span className={`icono-tono ${tono}`} aria-hidden="true"><Icon name={icono} size={20} /></span><span className="estadistica-kpi-label">{etiqueta}</span><strong className="estadistica-kpi-valor cifra">{valor}</strong>{detalle && <span className="estadistica-kpi-detalle">{detalle}</span>}</article>
}

export default function EstadisticasPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo }) {
  const revisionApi = useRecargaApi()
  const [seleccion, setSeleccion] = useState(vehiculoId || '')
  const id = seleccion || vehiculos.find((v) => v.esPrincipal)?.id || vehiculos[0]?.id || ''
  const [datos, setDatos] = useState(null)
  const [periodo, setPeriodo] = useState('1M')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const unidades = useUnidades()
  useEffect(() => {
    if (!id) return
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const [estadisticas, rendimiento, resumen, gastos] = await Promise.all([obtenerEstadisticas(id, periodo), obtenerRendimiento(id), obtenerResumenVehiculo(id), obtenerResumenGastos(id)])
        if (vigente) setDatos({ estadisticas, rendimiento, resumen, gastos })
      } catch (err) { if (vigente) setError(mensajeError(err, 'cargar las estadísticas')) }
      finally { if (vigente) setCargando(false) }
    }
    void cargar()
    return () => { vigente = false }
  }, [id, periodo, intento, revisionApi])
  const e = datos?.estadisticas
  const r = datos?.rendimiento
  return <div className="estadisticas-page contenedor">
    <EncabezadoPagina titulo="Estadísticas" descripcion="Conoce el costo de cada recorrido y la evolución de tu vehículo.">
      {vehiculos.length > 1 && <label className="estadisticas-selector"><span>Vehículo</span><select className="selector-vehiculo" value={id} onChange={(evento) => { setSeleccion(evento.target.value); onSeleccionarVehiculo?.(evento.target.value) }}>{vehiculos.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} · {v.placas}</option>)}</select></label>}
    </EncabezadoPagina>
    {!id ? <EstadoVacio icono="chart" titulo="Primero registra un vehículo" texto="Con tus cargas, servicios y gastos construiremos tus estadísticas." /> : <>
      <div className="estadisticas-toolbar"><div><span className="grafica-eyebrow">Tu vehículo en cifras</span><h2>Resumen del periodo</h2></div><div className="periodo-selector" role="group" aria-label="Periodo de estadísticas">{periodos.map(([valor, texto]) => <button key={valor} aria-pressed={periodo === valor} onClick={() => setPeriodo(valor)}>{texto}</button>)}</div></div>
      {error && <Alerta tipo="error" titulo="No pudimos cargar las estadísticas" accion={<button className="btn btn--secundario btn--sm" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>}>{error}</Alerta>}
      {cargando ? <div className="estadisticas-cargando" role="status"><Spinner size={24} /><span>Preparando tus estadísticas…</span><div className="estadisticas-skeleton" aria-hidden="true">{[1, 2, 3, 4].map((n) => <div key={n} className="skeleton" />)}</div></div> : !error && e && <>
        <p className="estadisticas-fechas">Del {e.desde} al {e.hasta} · Importes en MXN</p>
        <div className="estadisticas-kpis">
          <Indicador icono="wallet" etiqueta="Gasto del periodo" valor={moneda(e.gastoTotal)} detalle="Todos los gastos de tu expediente" />
          <Indicador icono="car" etiqueta="Distancia recorrida" valor={unidades.distancia(e.distanciaKm)} detalle="Calculada con tus registros de odómetro" />
          <Indicador icono="chart" tono={e.variacionCostoPorKm != null && e.variacionCostoPorKm < 0 ? 'tono-verde' : 'tono-azul'} etiqueta="Costo por kilómetro" valor={e.costoPorKm == null ? '—' : moneda(e.costoPorKm)} detalle={e.variacionCostoPorKm == null ? 'Sin datos para comparar' : `${e.variacionCostoPorKm > 0 ? '+' : ''}${e.variacionCostoPorKm} % vs. periodo anterior`} />
          <Indicador icono="fuel" tono="tono-verde" etiqueta="Rendimiento del periodo" valor={unidades.rendimiento(e.rendimientoPromedio)} detalle="Promedio de cargas con rendimiento" />
        </div>
        <div className="estadisticas-graficas">
          <GraficaRendimiento datos={e.rendimientoMensual || []} promedio={e.rendimientoPromedio} formatear={unidades.rendimiento} />
          <GraficaGastos desglose={datos.gastos?.desglose} total={datos.gastos?.totalMes} etiqueta="Mes actual" />
        </div>
        <section className="estadisticas-perspectiva tarjeta"><span className="icono-tono tono-azul"><Icon name="wallet" size={24} /></span><div><span className="grafica-eyebrow">Una mirada al cierre de mes</span><h3>A este ritmo gastarás {moneda(e.gastoProyectadoMes)}</h3><p>Proyección basada en los gastos registrados este mes. En los últimos 30 días recorriste {unidades.distancia(e.distanciaUltimos30Dias)}.</p></div></section>
        <details className="estadisticas-detalles tarjeta"><summary><span><strong>Combustible y autonomía</strong><small>Consulta tu rendimiento histórico y consumo del mes</small></span><Icon name="chevron-derecha" size={18} /></summary><div className="estadisticas-kpis estadisticas-kpis--secundarios">
          <Indicador icono="fuel" etiqueta="Rendimiento histórico" valor={r?.rendimientoPromedioKml > 0 ? unidades.rendimiento(r.rendimientoPromedioKml) : '—'} detalle="Se calcula desde la segunda carga con tanque lleno" />
          <Indicador icono="chart" etiqueta="Vs. mes anterior" valor={r?.variacionMesAnteriorPorcentaje == null ? '—' : `${r.variacionMesAnteriorPorcentaje > 0 ? '+' : ''}${r.variacionMesAnteriorPorcentaje} %`} detalle="Variación del rendimiento" />
          <Indicador icono="wallet" etiqueta="Combustible este mes" valor={moneda(r?.gastoMesActual)} />
          <Indicador icono="car" etiqueta="Autonomía estimada" valor={r?.autonomiaEstimadaKm > 0 ? unidades.distancia(r.autonomiaEstimadaKm) : '—'} detalle="Requiere conocer la capacidad del tanque" />
        </div></details>
        <section className="estadisticas-expediente" aria-label="Registros de tu expediente">{[['fuel', 'Cargas registradas', r?.totalCargas], ['wrench', 'Servicios registrados', datos.resumen?.totalServicios], ['bell', 'Recordatorios pendientes', datos.resumen?.totalRecordatoriosPendientes]].map(([icono, texto, cantidad]) => <div key={texto}><Icon name={icono} size={20} /><strong>{Number(cantidad || 0).toLocaleString('es-MX')}</strong><span>{texto}</span></div>)}</section>
      </>}
    </>}
  </div>
}
