import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icons'
import ConfirmarDialogo from '../../components/ConfirmarDialogo'
import Campo from '../../components/Campo'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { useAviso } from '../../components/Aviso'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import {
  CATEGORIAS_RECORDATORIO,
  TITULOS_SUGERIDOS,
  categoriaRecordatorio,
  concluirRecordatorio,
  crearRecordatorioFecha,
  crearRecordatorioKilometraje,
  estadoRecordatorio,
  listarRecordatoriosVehiculo,
  listarTodosRecordatorios,
} from './recordatoriosApi'
import './RecordatoriosPage.css'

const TODOS = 'todos'

const FILTROS = [
  { id: 'pendientes', nombre: 'Pendientes' },
  { id: 'atender', nombre: 'Por atender' },
  { id: 'completados', nombre: 'Completados' },
  { id: 'todos', nombre: 'Todos' },
]

const ORDEN_ESTADO = { vencido: 0, proximo: 1, vigente: 2, neutro: 3, hecho: 4 }

function fechaHoy() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function formatearFecha(fecha) {
  if (!fecha) return ''
  return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formVacio(vehiculoPredeterminadoId = '') {
  return {
    vehiculoId: vehiculoPredeterminadoId,
    titulo: '',
    categoria: 'seguro',
    tipo: 'fecha',
    fecha: '',
    kilometraje: '',
    anticipacionDias: 7,
    pushPrioritaria: false,
  }
}

function detalleFecha(recordatorio) {
  if (recordatorio.criterio === 'por_fecha') {
    return recordatorio.fechaLimite ? `Vence el ${formatearFecha(recordatorio.fechaLimite)}` : 'Sin fecha definida'
  }
  return `Meta: ${Number(recordatorio.kmObjetivo || 0).toLocaleString('es-MX')} km`
}

/**
 * Recordatorios conectados a la API:
 * - GET /api/vehiculos/{id}/recordatorios (un vehículo, todos los estados)
 * - GET /api/recordatorios (todos los vehículos)
 * - POST .../recordatorios/fecha | /kilometraje
 * - PATCH /api/recordatorios/{id}/concluir
 */
export default function RecordatoriosPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo }) {
  const [vehiculoElegidoId, setVehiculoActualId] = useState(vehiculoId || '')
  // Si no hay uno elegido (o los vehículos llegaron después), se usa el primero.
  const vehiculoActualId = vehiculoElegidoId || vehiculos[0]?.id || ''
  const [recordatorios, setRecordatorios] = useState([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [servicioNoDisponible, setServicioNoDisponible] = useState(false)
  const [intento, setIntento] = useState(0)
  const [filtro, setFiltro] = useState('pendientes')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(() => formVacio(vehiculoActualId))
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [porConcluir, setPorConcluir] = useState(null)
  const [concluyendo, setConcluyendo] = useState(false)
  const formRef = useRef(null)
  const { avisar } = useAviso()

  useEffect(() => {
    if (!vehiculoActualId) return undefined
    let vigente = true
    const cargar = async () => {
    setCargandoLista(true)
    setErrorLista('')
    setServicioNoDisponible(false)
    const peticion =
      vehiculoActualId === TODOS
        ? Promise.all([
            listarTodosRecordatorios({ estado: 'pendiente' }),
            listarTodosRecordatorios({ estado: 'concluido' }),
          ]).then(([pendientes, concluidos]) => [...(pendientes || []), ...(concluidos || [])])
        : listarRecordatoriosVehiculo(vehiculoActualId)
    peticion
      .then((datos) => {
        if (vigente) setRecordatorios(Array.isArray(datos) ? datos : [])
      })
      .catch((err) => {
        if (vigente) {
          setErrorLista(mensajeError(err, 'cargar los recordatorios'))
          setRecordatorios([])
          setServicioNoDisponible(err?.status === 404)
        }
      })
      .finally(() => {
        if (vigente) setCargandoLista(false)
      })
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [vehiculoActualId, intento])

  const recargar = () => setIntento((n) => n + 1)

  const registros = recordatorios
    .map((recordatorio) => ({ ...recordatorio, estadoUi: estadoRecordatorio(recordatorio) }))
    .sort((a, b) => {
      const ordenA = ORDEN_ESTADO[a.estadoUi.tono] ?? 9
      const ordenB = ORDEN_ESTADO[b.estadoUi.tono] ?? 9
      if (ordenA !== ordenB) return ordenA - ordenB
      return String(a.fechaLimite || '').localeCompare(String(b.fechaLimite || ''))
    })

  const pendientes = registros.filter((r) => r.estado !== 'concluido')
  const vencidos = pendientes.filter((r) => r.estadoUi.tono === 'vencido')
  const proximos = pendientes.filter((r) => r.estadoUi.tono === 'proximo')
  const completados = registros.filter((r) => r.estado === 'concluido')

  const visibles = registros.filter((r) => {
    if (filtro === 'pendientes') return r.estado !== 'concluido'
    if (filtro === 'atender') return r.estado !== 'concluido' && ['vencido', 'proximo'].includes(r.estadoUi.tono)
    if (filtro === 'completados') return r.estado === 'concluido'
    return true
  })

  const cambiarVehiculo = (id) => {
    setVehiculoActualId(id)
    if (id !== TODOS && onSeleccionarVehiculo) onSeleccionarVehiculo(id)
  }

  const abrirModal = () => {
    const predeterminado = vehiculoActualId === TODOS ? vehiculos[0]?.id || '' : vehiculoActualId
    setForm(formVacio(predeterminado))
    setErrores({})
    setErrorServidor('')
    setModalAbierto(true)
  }

  const usarSugerencia = (sugerencia) => {
    setForm((actual) => ({ ...actual, titulo: sugerencia.titulo, categoria: sugerencia.categoria }))
    if (errores.titulo) setErrores((actuales) => ({ ...actuales, titulo: undefined }))
  }

  const onChange = (evento) => {
    const { name, value, type, checked } = evento.target
    setForm((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }))
    if (errores[name]) setErrores((actuales) => ({ ...actuales, [name]: undefined }))
  }

  const guardar = async (evento) => {
    evento.preventDefault()
    if (guardando) return
    const nuevos = {}
    const kilometraje = Number(form.kilometraje)
    const vehiculoDestinoId = form.vehiculoId
    const vehiculoDestino = vehiculos.find((v) => v.id === vehiculoDestinoId)
    const anticipacion = Number(form.anticipacionDias) || 7

    if (!vehiculoDestinoId) nuevos.vehiculoId = 'Elige a qué vehículo corresponde el recordatorio.'

    if (!form.titulo.trim()) nuevos.titulo = 'Escribe qué hay que hacer (ej. Renovar seguro) o elige una sugerencia.'
    else if (form.titulo.trim().length > 120) nuevos.titulo = 'Usa máximo 120 caracteres.'

    if (form.tipo === 'fecha') {
      if (!form.fecha) nuevos.fecha = 'Elige la fecha límite del trámite o servicio.'
      else if (form.fecha < fechaHoy()) nuevos.fecha = 'La fecha ya pasó; elige hoy o una fecha futura.'
    } else {
      const odometroBase = Number(vehiculoDestino?.odometroActual ?? vehiculoDestino?.kilometrajeInicial ?? 0)
      if (form.kilometraje === '' || !Number.isInteger(kilometraje) || kilometraje <= 0) {
        nuevos.kilometraje = 'Escribe a qué kilometraje quieres el aviso, sin decimales (ej. 65000).'
      } else if (kilometraje <= odometroBase) {
        nuevos.kilometraje = `Debe ser mayor al kilometraje actual del vehículo (${odometroBase.toLocaleString('es-MX')} km).`
      }
    }

    setErrores(nuevos)
    setErrorServidor('')
    if (Object.keys(nuevos).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }

    setGuardando(true)
    try {
      const datos = {
        titulo: form.titulo.trim(),
        tipo: form.categoria,
        anticipacionDias: anticipacion,
        pushPrioritaria: form.pushPrioritaria,
      }
      if (form.tipo === 'fecha') {
        await crearRecordatorioFecha(vehiculoDestinoId, { ...datos, fechaLimite: form.fecha })
      } else {
        await crearRecordatorioKilometraje(vehiculoDestinoId, { ...datos, kmObjetivo: kilometraje })
      }
      setModalAbierto(false)
      setFiltro('pendientes')
      recargar()
      avisar(`Recordatorio «${datos.titulo}» creado. Te avisaremos con ${anticipacion} días de anticipación.`)
    } catch (err) {
      setErrorServidor(mensajeError(err, 'guardar el recordatorio'))
    } finally {
      setGuardando(false)
    }
  }

  const confirmarConcluir = async () => {
    if (!porConcluir) return
    setConcluyendo(true)
    try {
      await concluirRecordatorio(porConcluir.id)
      setPorConcluir(null)
      recargar()
      avisar('Recordatorio concluido. Lo encontrarás en «Completados».')
    } catch (err) {
      setPorConcluir(null)
      avisar(mensajeError(err, 'concluir el recordatorio'), 'error')
    } finally {
      setConcluyendo(false)
    }
  }

  const sinDatos = cargandoLista || Boolean(errorLista)
  const cifra = (lista) => (sinDatos ? '—' : lista.length)
  const textoCifra = (lista) => (sinDatos ? 'sin datos' : String(lista.length))

  const nombreVehiculo = (v) => [`${v.marca} ${v.modelo}`, v.placas].filter(Boolean).join(' · ')

  if (vehiculos.length === 0) {
    return (
      <div className="recordatorios-page contenedor">
        <EncabezadoPagina titulo="Recordatorios" descripcion="Seguro, verificación, tenencia y servicios: te avisamos antes de que venzan." />
        <EstadoVacio
          icono="car"
          titulo="Primero registra un vehículo"
          texto="Los recordatorios se asignan a un vehículo. Regístralo y vuelve aquí para crear el primero."
        />
      </div>
    )
  }

  return (
    <div className="recordatorios-page contenedor">
      <EncabezadoPagina
        titulo="Recordatorios"
        descripcion="Seguro, verificación, tenencia y servicios: te avisamos antes de que venzan."
      >
        <label className="mes-selector">
          <span>Vehículo</span>
          <select
            className="selector-vehiculo"
            value={vehiculoActualId}
            onChange={(evento) => cambiarVehiculo(evento.target.value)}
          >
            {vehiculos.length > 1 && <option value={TODOS}>Todos mis vehículos</option>}
            {vehiculos.map((vehiculo) => (
              <option key={vehiculo.id} value={vehiculo.id}>
                {nombreVehiculo(vehiculo)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--primario" onClick={abrirModal}>
          <Icon name="plus" size={18} />
          Nuevo recordatorio
        </button>
      </EncabezadoPagina>

      <section
        className={sinDatos ? 'recordatorios-resumen sin-datos' : 'recordatorios-resumen'}
        aria-label="Resumen de recordatorios"
        aria-busy={cargandoLista || undefined}
      >
        <article className="recordatorio-stat">
          <span className="recordatorio-stat-icono tono-rojo" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <span className="recordatorio-stat-label">Vencidos</span>
          <strong className="cifra" aria-label={textoCifra(vencidos)}>{cifra(vencidos)}</strong>
        </article>
        <article className="recordatorio-stat">
          <span className="recordatorio-stat-icono tono-ambar" aria-hidden="true">
            <Icon name="reloj" size={18} />
          </span>
          <span className="recordatorio-stat-label">Próximos</span>
          <strong className="cifra" aria-label={textoCifra(proximos)}>{cifra(proximos)}</strong>
        </article>
        <article className="recordatorio-stat">
          <span className="recordatorio-stat-icono tono-azul" aria-hidden="true">
            <Icon name="bell" size={18} />
          </span>
          <span className="recordatorio-stat-label">Pendientes</span>
          <strong className="cifra" aria-label={textoCifra(pendientes)}>{cifra(pendientes)}</strong>
        </article>
        <article className="recordatorio-stat">
          <span className="recordatorio-stat-icono tono-verde" aria-hidden="true">
            <Icon name="check-circulo" size={18} />
          </span>
          <span className="recordatorio-stat-label">Completados</span>
          <strong className="cifra" aria-label={textoCifra(completados)}>{cifra(completados)}</strong>
        </article>
      </section>

      {!errorLista && (
      <div className="recordatorios-filtros" role="group" aria-label="Mostrar recordatorios">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            className={filtro === opcion.id ? 'filtro-btn activo' : 'filtro-btn'}
            onClick={() => setFiltro(opcion.id)}
            aria-pressed={filtro === opcion.id}
          >
            {opcion.nombre}
          </button>
        ))}
      </div>
      )}

      {errorLista && (
        <Alerta
          tipo="error"
          titulo="No pudimos cargar tus recordatorios"
          accion={
            <button type="button" className="btn btn--secundario btn--sm" onClick={recargar} disabled={cargandoLista}>
              <Icon name="refrescar" size={16} />
              Reintentar
            </button>
          }
        >
          {errorLista}
          {servicioNoDisponible && (
            <> Mientras tanto puedes crear recordatorios nuevos; aparecerán en esta lista cuando el servicio esté disponible.</>
          )}
        </Alerta>
      )}

      <p className="sr-only" role="status">
        {cargandoLista
          ? 'Cargando recordatorios…'
          : `${visibles.length} recordatorio${visibles.length === 1 ? '' : 's'} en la vista actual.`}
      </p>

      {cargandoLista ? (
        <p className="estado-carga" aria-hidden="true">
          <Spinner size={20} />
          Cargando recordatorios…
        </p>
      ) : errorLista ? null : visibles.length > 0 ? (
        <ul className="recordatorios-lista">
          {visibles.map((recordatorio) => {
            const categoria = categoriaRecordatorio(recordatorio.tipo)
            const concluido = recordatorio.estado === 'concluido'
            return (
              <li
                key={recordatorio.id}
                className={`recordatorio-card ${concluido ? 'hecho' : recordatorio.estadoUi.tono}`}
              >
                <span
                  className="recordatorio-icono"
                  style={{ background: `${categoria.color}1f`, color: categoria.color }}
                  aria-hidden="true"
                >
                  <Icon name={categoria.icon} size={20} />
                </span>

                <div className="recordatorio-info">
                  <div className="recordatorio-titulo-row">
                    <h2 className="recordatorio-titulo">{recordatorio.titulo}</h2>
                    <span className={`recordatorio-badge ${recordatorio.estadoUi.tono}`}>
                      {recordatorio.estadoUi.etiqueta}
                    </span>
                  </div>
                  <p className="recordatorio-meta">
                    {categoria.nombre} · {detalleFecha(recordatorio)}
                    {vehiculoActualId === TODOS && recordatorio.vehiculoModelo && (
                      <> · {[recordatorio.vehiculoModelo, recordatorio.vehiculoPlacas].filter(Boolean).join(' ')}</>
                    )}
                    {recordatorio.pushPrioritaria && (
                      <span className="recordatorio-badge-prioridad">Aviso al teléfono</span>
                    )}
                  </p>
                  <p className="recordatorio-estado">{recordatorio.estadoUi.detalle}</p>
                </div>

                {!concluido && (
                  <div className="recordatorio-acciones">
                    <button
                      type="button"
                      className="btn btn--secundario btn--sm"
                      onClick={() => setPorConcluir(recordatorio)}
                      aria-label={`Marcar como hecho: ${recordatorio.titulo}`}
                    >
                      <Icon name="check" size={16} />
                      Hecho
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <EstadoVacio
          icono={filtro === 'completados' ? 'check-circulo' : 'bell'}
          titulo={
            filtro === 'completados'
              ? 'Aún no completas recordatorios'
              : filtro === 'atender'
                ? 'Nada urgente por ahora'
                : 'Sin recordatorios pendientes'
          }
          texto={
            filtro === 'completados'
              ? 'Cuando marques un recordatorio como hecho aparecerá aquí.'
              : 'Crea un recordatorio para no olvidar trámites y servicios de tu vehículo.'
          }
        >
          <button type="button" className="btn btn--primario" onClick={abrirModal}>
            <Icon name="plus" size={18} />
            Nuevo recordatorio
          </button>
        </EstadoVacio>
      )}

      {modalAbierto && (
        <Modal titulo="Nuevo recordatorio" onCerrar={() => (guardando ? null : setModalAbierto(false))}>
          <p className="modal-texto">Elige una sugerencia o escribe el tuyo.</p>
          <div className="recordatorio-sugerencias" role="group" aria-label="Sugerencias de título">
            {TITULOS_SUGERIDOS.map((sugerencia) => (
              <button
                key={sugerencia.titulo}
                type="button"
                className={form.titulo === sugerencia.titulo ? 'sugerencia-chip activo' : 'sugerencia-chip'}
                onClick={() => usarSugerencia(sugerencia)}
                aria-pressed={form.titulo === sugerencia.titulo}
              >
                {sugerencia.titulo}
              </button>
            ))}
          </div>

          <form ref={formRef} className="formulario form-grid" onSubmit={guardar} noValidate aria-busy={guardando || undefined}>
            {vehiculos.length > 1 && (
              <Campo etiqueta="Vehículo" error={errores.vehiculoId} className="ancho-completo">
                <select name="vehiculoId" value={form.vehiculoId} onChange={onChange}>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {nombreVehiculo(v)}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            <Campo etiqueta="¿Qué hay que hacer?" error={errores.titulo} className="ancho-completo">
              <input name="titulo" value={form.titulo} onChange={onChange} maxLength={120} placeholder="Ej. Renovar póliza de seguro" />
            </Campo>

            <Campo etiqueta="Categoría">
              <select name="categoria" value={form.categoria} onChange={onChange}>
                {CATEGORIAS_RECORDATORIO.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Avisarme por">
              <select name="tipo" value={form.tipo} onChange={onChange}>
                <option value="fecha">Fecha</option>
                <option value="kilometraje">Kilometraje</option>
              </select>
            </Campo>

            {form.tipo === 'fecha' ? (
              <Campo etiqueta="Fecha límite" error={errores.fecha}>
                <input type="date" name="fecha" value={form.fecha} onChange={onChange} min={fechaHoy()} />
              </Campo>
            ) : (
              <Campo
                etiqueta="Kilometraje meta"
                sufijo="km"
                ayuda={(() => {
                  const v = vehiculos.find((x) => x.id === form.vehiculoId)
                  return v ? `Actual: ${Number(v.odometroActual ?? v.kilometrajeInicial ?? 0).toLocaleString('es-MX')} km.` : undefined
                })()}
                error={errores.kilometraje}
              >
                <input type="number" inputMode="numeric" name="kilometraje" value={form.kilometraje} onChange={onChange} min="0" placeholder="65000" />
              </Campo>
            )}

            <Campo etiqueta="Avisarme con anticipación de">
              <select name="anticipacionDias" value={form.anticipacionDias} onChange={onChange}>
                <option value={3}>3 días</option>
                <option value={7}>7 días (recomendado)</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
              </select>
            </Campo>

            <label className="campo-check ancho-completo">
              <input
                type="checkbox"
                name="pushPrioritaria"
                checked={Boolean(form.pushPrioritaria)}
                onChange={onChange}
              />
              <span>Avisarme también con una notificación en el teléfono</span>
            </label>

            {errorServidor && (
              <Alerta tipo="error" titulo="No se guardó el recordatorio" className="ancho-completo">
                {errorServidor}
              </Alerta>
            )}

            <div className="modal-acciones ancho-completo">
              <button type="button" className="btn btn--secundario" onClick={() => setModalAbierto(false)} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primario" disabled={guardando} aria-busy={guardando || undefined}>
                {guardando && <Spinner size={16} />}
                {guardando ? 'Guardando…' : 'Guardar recordatorio'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {porConcluir && (
        <ConfirmarDialogo
          titulo="¿Marcar como hecho?"
          mensaje={`«${porConcluir.titulo}» pasará a Completados y ya no recibirás avisos de él.`}
          textoConfirmar="Sí, ya lo hice"
          textoCancelar="Todavía no"
          textoProceso="Guardando…"
          onConfirmar={confirmarConcluir}
          onCancelar={() => setPorConcluir(null)}
          cargando={concluyendo}
        />
      )}
    </div>
  )
}
