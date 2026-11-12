import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icons'
import Campo from '../../components/Campo'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { useAviso } from '../../components/Aviso'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import { nombreVehiculo } from '../../utils/vehiculo'
import { obtenerResumenVehiculo } from '../vehiculos/vehiculosApi'
import {
  CATEGORIAS_RECORDATORIO,
  TITULOS_SUGERIDOS,
  categoriaRecordatorio,
  crearRecordatorioFecha,
  crearRecordatorioKilometraje,
  estadoRecordatorio,
} from './recordatoriosApi'
import { calcularEstadoLocal, guardarRecordatorioCreado, leerRecordatoriosCreados } from './recordatoriosLocales'
import './RecordatoriosPage.css'

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
  if (recordatorio.criterio === 'por_fecha' || (!recordatorio.criterio && recordatorio.fechaLimite)) {
    return recordatorio.fechaLimite ? `Vence el ${formatearFecha(recordatorio.fechaLimite)}` : 'Sin fecha definida'
  }
  return `Meta: ${Number(recordatorio.kmObjetivo || 0).toLocaleString('es-MX')} km`
}

function odometroDe(vehiculo) {
  return Number(vehiculo?.odometroActual ?? vehiculo?.kilometrajeInicial ?? 0)
}

/**
 * Recordatorios con los endpoints que publica la API:
 * - GET  /api/vehiculos/{id}/resumen            → pendientes y próximo vencimiento
 * - POST /api/vehiculos/{id}/recordatorios/fecha | /kilometraje → crear
 * La respuesta de cada creación se guarda para mostrarla en la lista.
 */
export default function RecordatoriosLocalPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo }) {
  const [vehiculoElegidoId, setVehiculoElegidoId] = useState(vehiculoId || '')
  const vehiculoActualId = vehiculoElegidoId || vehiculos.find((v) => v.esPrincipal)?.id || vehiculos[0]?.id || ''
  const vehiculoActual = vehiculos.find((v) => v.id === vehiculoActualId) || null

  const [resumen, setResumen] = useState(null)
  const [cargandoResumen, setCargandoResumen] = useState(false)
  const [errorResumen, setErrorResumen] = useState('')
  const [intento, setIntento] = useState(0)
  const [creados, setCreados] = useState(() => leerRecordatoriosCreados())

  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(() => formVacio(vehiculoActualId))
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const formRef = useRef(null)
  const { avisar } = useAviso()

  // GET /api/vehiculos/{id}/resumen
  useEffect(() => {
    if (!vehiculoActualId) return undefined
    let vigente = true
    const cargar = async () => {
      setCargandoResumen(true)
      setErrorResumen('')
      try {
        const datos = await obtenerResumenVehiculo(vehiculoActualId)
        if (vigente) setResumen(datos)
      } catch (err) {
        if (vigente) {
          setResumen(null)
          setErrorResumen(mensajeError(err, 'cargar el resumen de recordatorios'))
        }
      } finally {
        if (vigente) setCargandoResumen(false)
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [vehiculoActualId, intento])

  const recargar = () => setIntento((n) => n + 1)

  const lista = creados
    .filter((r) => r.vehiculoId === vehiculoActualId)
    .map((r) => {
      const conEstado = calcularEstadoLocal(r, odometroDe(vehiculoActual))
      return { ...conEstado, estadoUi: estadoRecordatorio(conEstado) }
    })
    .sort((a, b) => {
      const ordenA = ORDEN_ESTADO[a.estadoUi.tono] ?? 9
      const ordenB = ORDEN_ESTADO[b.estadoUi.tono] ?? 9
      if (ordenA !== ordenB) return ordenA - ordenB
      return String(a.fechaLimite || '').localeCompare(String(b.fechaLimite || ''))
    })

  const totalPendientes = Number(resumen?.totalRecordatoriosPendientes ?? 0)
  const proximo = resumen?.proximoRecordatorio || null

  const cambiarVehiculo = (id) => {
    setVehiculoElegidoId(id)
    onSeleccionarVehiculo?.(id)
  }

  const abrirModal = () => {
    setForm(formVacio(vehiculoActualId))
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
    const vehiculoDestinoId = form.vehiculoId || vehiculoActualId
    const vehiculoDestino = vehiculos.find((v) => v.id === vehiculoDestinoId)
    const anticipacion = Number(form.anticipacionDias) || 7

    if (!vehiculoDestinoId) nuevos.vehiculoId = 'Elige a qué vehículo corresponde el recordatorio.'

    if (!form.titulo.trim()) nuevos.titulo = 'Escribe qué hay que hacer (ej. Renovar seguro) o elige una sugerencia.'
    else if (form.titulo.trim().length > 120) nuevos.titulo = 'Usa máximo 120 caracteres.'

    if (form.tipo === 'fecha') {
      if (!form.fecha) nuevos.fecha = 'Elige la fecha límite del trámite o servicio.'
      else if (form.fecha < fechaHoy()) nuevos.fecha = 'La fecha ya pasó; elige hoy o una fecha futura.'
    } else {
      const base = odometroDe(vehiculoDestino)
      if (form.kilometraje === '' || !Number.isInteger(kilometraje) || kilometraje <= 0) {
        nuevos.kilometraje = 'Escribe a qué kilometraje quieres el aviso, sin decimales (ej. 65000).'
      } else if (kilometraje <= base) {
        nuevos.kilometraje = `Debe ser mayor al kilometraje actual del vehículo (${base.toLocaleString('es-MX')} km).`
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
      const creado =
        form.tipo === 'fecha'
          ? await crearRecordatorioFecha(vehiculoDestinoId, { ...datos, fechaLimite: form.fecha })
          : await crearRecordatorioKilometraje(vehiculoDestinoId, { ...datos, kmObjetivo: kilometraje })

      // La API responde con el recordatorio creado (RecordatorioResponse).
      guardarRecordatorioCreado({
        id: creado?.id,
        vehiculoId: creado?.vehiculoId || vehiculoDestinoId,
        tipo: creado?.tipo || form.categoria,
        titulo: creado?.titulo || datos.titulo,
        criterio: creado?.criterio || (form.tipo === 'fecha' ? 'por_fecha' : 'por_kilometraje'),
        fechaLimite: creado?.fechaLimite ?? (form.tipo === 'fecha' ? form.fecha : null),
        kmObjetivo: creado?.kmObjetivo ?? (form.tipo === 'fecha' ? null : kilometraje),
        anticipacionDias: creado?.anticipacionDias ?? anticipacion,
        pushPrioritaria: creado?.pushPrioritaria ?? form.pushPrioritaria,
        estado: creado?.estado || 'pendiente',
        creadoEn: creado?.creadoEn || new Date().toISOString(),
      })
      setCreados(leerRecordatoriosCreados())
      setModalAbierto(false)
      if (vehiculoDestinoId !== vehiculoActualId) cambiarVehiculo(vehiculoDestinoId)
      recargar()
      avisar(`Recordatorio «${datos.titulo}» creado. Te avisaremos con ${anticipacion} días de anticipación.`)
    } catch (err) {
      setErrorServidor(mensajeError(err, 'guardar el recordatorio'))
    } finally {
      setGuardando(false)
    }
  }

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

  const sinDatos = cargandoResumen || Boolean(errorResumen)

  return (
    <div className="recordatorios-page contenedor">
      <EncabezadoPagina
        titulo="Recordatorios"
        descripcion="Seguro, verificación, tenencia y servicios: te avisamos antes de que venzan."
      >
        {vehiculos.length > 1 && (
          <label className="mes-selector">
            <span>Vehículo</span>
            <select
              className="selector-vehiculo"
              value={vehiculoActualId}
              onChange={(evento) => cambiarVehiculo(evento.target.value)}
            >
              {vehiculos.map((vehiculo) => (
                <option key={vehiculo.id} value={vehiculo.id}>
                  {nombreVehiculo(vehiculo)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn--primario" onClick={abrirModal}>
          <Icon name="plus" size={18} />
          Nuevo recordatorio
        </button>
      </EncabezadoPagina>

      {/* Resumen del servidor: GET /api/vehiculos/{id}/resumen */}
      <section
        className={sinDatos ? 'recordatorios-resumen recordatorios-resumen--dos sin-datos' : 'recordatorios-resumen recordatorios-resumen--dos'}
        aria-label="Resumen de recordatorios"
        aria-busy={cargandoResumen || undefined}
      >
        <article className="recordatorio-stat">
          <span className="recordatorio-stat-icono tono-azul" aria-hidden="true">
            <Icon name="bell" size={18} />
          </span>
          <span className="recordatorio-stat-label">Pendientes</span>
          <strong className="cifra" aria-label={sinDatos ? 'sin datos' : String(totalPendientes)}>
            {sinDatos ? '—' : totalPendientes}
          </strong>
        </article>
        <article className="recordatorio-stat recordatorio-stat--proximo">
          <span className="recordatorio-stat-icono tono-ambar" aria-hidden="true">
            <Icon name="reloj" size={18} />
          </span>
          <span className="recordatorio-stat-label">Próximo vencimiento</span>
          {sinDatos ? (
            <strong className="cifra" aria-label="sin datos">—</strong>
          ) : proximo ? (
            <>
              <strong className="recordatorio-proximo-titulo">{proximo.titulo}</strong>
              <span className="recordatorio-proximo-detalle">{detalleFecha(proximo)}</span>
            </>
          ) : (
            <strong className="recordatorio-proximo-titulo">Ninguno</strong>
          )}
        </article>
      </section>

      {errorResumen && (
        <Alerta
          tipo="error"
          titulo="No pudimos cargar el resumen"
          accion={
            <button type="button" className="btn btn--secundario btn--sm" onClick={recargar} disabled={cargandoResumen}>
              <Icon name="refrescar" size={16} />
              Reintentar
            </button>
          }
        >
          {errorResumen}
        </Alerta>
      )}

      <section className="seccion" aria-labelledby="titulo-creados">
        <div className="seccion-head">
          <h2 id="titulo-creados">Creados en este dispositivo</h2>
          {lista.length > 0 && <span className="badge">{lista.length}</span>}
        </div>

        {lista.length > 0 ? (
          <ul className="recordatorios-lista">
            {lista.map((recordatorio) => {
              const categoria = categoriaRecordatorio(recordatorio.tipo)
              return (
                <li key={recordatorio.id} className={`recordatorio-card ${recordatorio.estadoUi.tono}`}>
                  <span
                    className="recordatorio-icono"
                    style={{ background: `${categoria.color}1f`, color: categoria.color }}
                    aria-hidden="true"
                  >
                    <Icon name={categoria.icon} size={20} />
                  </span>
                  <div className="recordatorio-info">
                    <div className="recordatorio-titulo-row">
                      <h3 className="recordatorio-titulo">{recordatorio.titulo}</h3>
                      <span className={`recordatorio-badge ${recordatorio.estadoUi.tono}`}>
                        {recordatorio.estadoUi.etiqueta}
                      </span>
                    </div>
                    <p className="recordatorio-meta">
                      {categoria.nombre} · {detalleFecha(recordatorio)}
                      {recordatorio.pushPrioritaria && <span className="recordatorio-badge-prioridad">Prioritario</span>}
                    </p>
                    <p className="recordatorio-estado">{recordatorio.estadoUi.detalle}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EstadoVacio
            icono="bell"
            titulo="Aún no creas recordatorios aquí"
            texto="Crea uno para el seguro, la verificación o el próximo servicio y aparecerá en esta lista."
          >
            <button type="button" className="btn btn--primario" onClick={abrirModal}>
              <Icon name="plus" size={18} />
              Nuevo recordatorio
            </button>
          </EstadoVacio>
        )}

        <p className="proximamente-linea recordatorios-nota">
          <span className="nav-proximamente">Próximamente</span>
          Ver todos tus recordatorios desde cualquier dispositivo y marcarlos como hechos.
        </p>
      </section>

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
                  const v = vehiculos.find((x) => x.id === (form.vehiculoId || vehiculoActualId))
                  return v ? `Actual: ${odometroDe(v).toLocaleString('es-MX')} km.` : undefined
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
              <span>Marcar como prioritario</span>
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
    </div>
  )
}
