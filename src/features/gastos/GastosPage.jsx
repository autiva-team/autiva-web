import { useRecargaApi } from '../../api/useRecargaApi'
import { useEffect, useRef, useState } from 'react'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import Campo from '../../components/Campo'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import Spinner from '../../components/Spinner'
import Modal from '../../components/Modal'
import { useAviso } from '../../components/Aviso'
import { mensajeError } from '../../utils/mensajes'
import { fechaMexico } from '../../utils/fechas'
import { CATEGORIAS_GASTO, obtenerGastos, obtenerResumenGastos, registrarGasto } from './gastosApi'
import './GastosPage.css'

const moneda = (n) => Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function FormularioGasto({ vehiculoId, onCerrar, onGuardado }) {
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const id = useRef(crypto.randomUUID())
  const guardar = async (evento) => {
    evento.preventDefault()
    if (guardando) return
    const campos = Object.fromEntries(new FormData(evento.currentTarget))
    if (!campos.concepto.trim()) { setError('Escribe el concepto del gasto.'); return }
    setGuardando(true)
    setError('')
    try {
      await registrarGasto(vehiculoId, { ...campos, id: id.current, concepto: campos.concepto.trim(), categoriaId: Number(campos.categoriaId), monto: Number(campos.monto), odometro: campos.odometro === '' ? null : Number(campos.odometro) })
      onGuardado()
    } catch (err) { setError(mensajeError(err, 'registrar el gasto')) }
    finally { setGuardando(false) }
  }
  return <Modal titulo="Registrar gasto" onCerrar={() => !guardando && onCerrar()}>
    <form onSubmit={guardar} className="gastos-form">
      {error && <Alerta tipo="error">{error}</Alerta>}
      <Campo etiqueta="Categoría"><select name="categoriaId">{CATEGORIAS_GASTO.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}</select></Campo>
      <Campo etiqueta="Concepto"><input name="concepto" required maxLength={120} /></Campo>
      <Campo etiqueta="Monto" prefijo="$"><input name="monto" type="number" required min="0.01" step="0.01" /></Campo>
      <Campo etiqueta="Fecha"><input name="fecha" type="date" required defaultValue={fechaMexico()} max={fechaMexico()} /></Campo>
      <Campo etiqueta="Odómetro (km)" opcional><input name="odometro" type="number" min="0" step="1" /></Campo>
      <div className="modal-acciones"><button type="button" className="btn btn--secundario" disabled={guardando} onClick={onCerrar}>Cancelar</button><button className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar gasto'}</button></div>
    </form>
  </Modal>
}

export default function GastosPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo, onActualizado, iniciarRegistro = false }) {
  const revisionApi = useRecargaApi()
  const id = vehiculoId || vehiculos.find((v) => v.esPrincipal)?.id || vehiculos[0]?.id || ''
  const [mes, setMes] = useState(fechaMexico().slice(0, 7))
  const [categoriaId, setCategoriaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(Boolean(iniciarRegistro && id))
  const [intento, setIntento] = useState(0)
  const { avisar } = useAviso()
  useEffect(() => {
    if (!id) return
    let vigente = true
    const [anio, numeroMes] = mes.split('-').map(Number)
    const cargar = async () => {
      setCargando(true)
      setError('')
      await Promise.all([obtenerGastos(id, { anio, mes: numeroMes, categoriaId, pagina, tamano: 10 }), obtenerResumenGastos(id, anio, numeroMes)])
        .then(([lista, total]) => { if (vigente) { setDatos(lista); setResumen(total) } })
        .catch((err) => { if (vigente) setError(mensajeError(err, 'consultar los gastos')) })
        .finally(() => { if (vigente) setCargando(false) })
    }
    void cargar()
    return () => { vigente = false }
  }, [id, mes, categoriaId, pagina, intento, revisionApi])
  const filtro = (actualizar, valor) => { actualizar(valor); setPagina(1) }
  return <div className="gastos-page contenedor">
    <EncabezadoPagina titulo="Gastos" descripcion="Consulta el costo de tu vehículo y registra otros pagos.">
      <button className="btn btn--primario" disabled={!id} onClick={() => setFormulario(true)}>Registrar gasto</button>
    </EncabezadoPagina>
    {!id ? <EstadoVacio icono="wallet" titulo="Primero registra un vehículo" texto="Aquí podrás consultar y registrar sus gastos." /> : <>
      <div className="gastos-filtros">
        <Campo etiqueta="Vehículo"><select value={id} onChange={(e) => filtro(onSeleccionarVehiculo, e.target.value)}>{vehiculos.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} · {v.placas}</option>)}</select></Campo>
        <Campo etiqueta="Mes"><input type="month" value={mes} max={fechaMexico().slice(0, 7)} required onChange={(e) => e.target.value && filtro(setMes, e.target.value)} /></Campo>
        <Campo etiqueta="Categoría del historial"><select value={categoriaId} onChange={(e) => filtro(setCategoriaId, e.target.value)}><option value="">Todas</option>{CATEGORIAS_GASTO.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}</select></Campo>
      </div>
      {error && <Alerta tipo="error" accion={<button className="btn btn--secundario" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>}>{error}</Alerta>}
      {cargando ? <p role="status"><Spinner /> Consultando gastos…</p> : !error && <>
        <div className="gastos-resumen">
          <article className="tarjeta"><span>Total del mes</span><strong>{moneda(resumen?.totalMes)}</strong></article>
          <article className="tarjeta"><span>Vs. mes anterior</span><strong>{resumen?.variacionPorcentaje == null ? 'Sin datos para comparar' : `${resumen.variacionPorcentaje > 0 ? '+' : ''}${resumen.variacionPorcentaje} %`}</strong></article>
          <article className="tarjeta"><span>Promedio diario</span><strong>{moneda(resumen?.costoPromedioDiario)}</strong></article>
        </div>
        <section className="seccion"><h2>Distribución del mes</h2><p className="texto-secundario">Incluye combustible, mantenimiento y otros pagos de tu expediente.</p>
          {resumen?.desglose?.length ? resumen.desglose.map((c) => <div className="gasto-distribucion" key={c.categoria}><div><span>{c.categoria}</span><strong>{moneda(c.monto)} · {c.porcentaje} %</strong></div><progress value={c.porcentaje} max="100" aria-label={c.categoria} /></div>) : <p>No hay gastos en este mes.</p>}
        </section>
        <section className="seccion"><h2>Historial de otros gastos</h2><p className="texto-secundario">Las cargas y los servicios conservan sus propios historiales.</p>
          {datos?.items?.length ? <div className="gastos-lista">{datos.items.map((g) => <article className="tarjeta gasto-fila" key={g.id}><div><strong>{g.concepto}</strong><p>{g.categoria} · {g.fecha}{g.odometro != null && ` · ${g.odometro.toLocaleString('es-MX')} km`}</p></div><strong>{moneda(g.monto)}</strong></article>)}</div> : <EstadoVacio icono="wallet" titulo="Sin gastos para estos filtros" texto="Registra un gasto o consulta otro mes o categoría." />}
          {datos?.totalPaginas > 1 && <nav className="modal-acciones" aria-label="Páginas de gastos"><button className="btn btn--secundario" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina} de {datos.totalPaginas}</span><button className="btn btn--secundario" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button></nav>}
        </section>
      </>}
    </>}
    {formulario && <FormularioGasto key={id} vehiculoId={id} onCerrar={() => setFormulario(false)} onGuardado={() => { setFormulario(false); setIntento((n) => n + 1); avisar('Gasto registrado correctamente.'); onActualizado?.() }} />}
  </div>
}
