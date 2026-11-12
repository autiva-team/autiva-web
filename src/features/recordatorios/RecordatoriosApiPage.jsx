import { useEffect, useState } from 'react'
import Icon from '../../components/Icons'
import ConfirmarDialogo from '../../components/ConfirmarDialogo'
import Spinner from '../../components/Spinner'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import { useAviso } from '../../components/Aviso'
import { mensajeError } from '../../utils/mensajes'
import { concluirRecordatorio, estadoRecordatorio, listarRecordatoriosVehiculo, listarTodosRecordatorios } from './recordatoriosApi'
import { ordenarPorUrgencia } from './recordatoriosUi'
import EncabezadoRecordatorios, { RecordatoriosSinVehiculos, TODOS_LOS_VEHICULOS } from './EncabezadoRecordatorios'
import FormularioRecordatorio from './FormularioRecordatorio'
import TarjetaRecordatorio from './TarjetaRecordatorio'
import './RecordatoriosPage.css'

const FILTROS = [
  { id: 'pendientes', nombre: 'Pendientes' },
  { id: 'atender', nombre: 'Por atender' },
  { id: 'completados', nombre: 'Completados' },
  { id: 'todos', nombre: 'Todos' },
]

const CONTADORES = [
  { id: 'vencidos', etiqueta: 'Vencidos', icono: 'alert', tono: 'tono-rojo' },
  { id: 'proximos', etiqueta: 'Próximos', icono: 'reloj', tono: 'tono-ambar' },
  { id: 'pendientes', etiqueta: 'Pendientes', icono: 'bell', tono: 'tono-azul' },
  { id: 'completados', etiqueta: 'Completados', icono: 'check-circulo', tono: 'tono-verde' },
]

function cargarLista(vehiculoId) {
  if (vehiculoId === TODOS_LOS_VEHICULOS) {
    return Promise.all([
      listarTodosRecordatorios({ estado: 'pendiente' }),
      listarTodosRecordatorios({ estado: 'concluido' }),
    ]).then(([pendientes, concluidos]) => [...(pendientes || []), ...(concluidos || [])])
  }
  return listarRecordatoriosVehiculo(vehiculoId)
}

/**
 * Recordatorios conectados a la API:
 * - GET /api/vehiculos/{id}/recordatorios (un vehículo, todos los estados)
 * - GET /api/recordatorios (todos los vehículos)
 * - POST .../recordatorios/fecha | /kilometraje
 * - PATCH /api/recordatorios/{id}/concluir
 */
export default function RecordatoriosApiPage({ vehiculos = [], vehiculoId, onSeleccionarVehiculo }) {
  const [vehiculoElegidoId, setVehiculoElegidoId] = useState(vehiculoId || '')
  const vehiculoActualId = vehiculoElegidoId || vehiculos[0]?.id || ''
  const [recordatorios, setRecordatorios] = useState([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [intento, setIntento] = useState(0)
  const [filtro, setFiltro] = useState('pendientes')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [porConcluir, setPorConcluir] = useState(null)
  const [concluyendo, setConcluyendo] = useState(false)
  const { avisar } = useAviso()

  useEffect(() => {
    if (!vehiculoActualId) return undefined
    let vigente = true
    const cargar = async () => {
      setCargandoLista(true)
      setErrorLista('')
      try {
        const datos = await cargarLista(vehiculoActualId)
        if (vigente) setRecordatorios(Array.isArray(datos) ? datos : [])
      } catch (err) {
        if (vigente) {
          setRecordatorios([])
          setErrorLista(mensajeError(err, 'cargar los recordatorios'))
        }
      } finally {
        if (vigente) setCargandoLista(false)
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [vehiculoActualId, intento])

  const recargar = () => setIntento((n) => n + 1)

  const registros = recordatorios
    .map((recordatorio) => ({ ...recordatorio, estadoUi: estadoRecordatorio(recordatorio) }))
    .sort(ordenarPorUrgencia)
  const pendientes = registros.filter((r) => r.estado !== 'concluido')
  const grupos = {
    vencidos: pendientes.filter((r) => r.estadoUi.tono === 'vencido'),
    proximos: pendientes.filter((r) => r.estadoUi.tono === 'proximo'),
    pendientes,
    completados: registros.filter((r) => r.estado === 'concluido'),
  }
  const visibles = {
    pendientes,
    atender: [...grupos.vencidos, ...grupos.proximos],
    completados: grupos.completados,
    todos: registros,
  }[filtro]

  const cambiarVehiculo = (id) => {
    setVehiculoElegidoId(id)
    if (id !== TODOS_LOS_VEHICULOS) onSeleccionarVehiculo?.(id)
  }

  const alCrear = (_creado, enviados) => {
    setModalAbierto(false)
    setFiltro('pendientes')
    recargar()
    avisar(`Recordatorio «${enviados.titulo}» creado. Te avisaremos con ${enviados.anticipacionDias} días de anticipación.`)
  }

  const confirmarConcluir = async () => {
    if (!porConcluir) return
    setConcluyendo(true)
    try {
      await concluirRecordatorio(porConcluir.id)
      recargar()
      avisar('Recordatorio concluido. Lo encontrarás en «Completados».')
    } catch (err) {
      avisar(mensajeError(err, 'concluir el recordatorio'), 'error')
    } finally {
      setPorConcluir(null)
      setConcluyendo(false)
    }
  }

  if (vehiculos.length === 0) return <RecordatoriosSinVehiculos />

  const sinDatos = cargandoLista || Boolean(errorLista)
  const vehiculoFormulario = vehiculoActualId === TODOS_LOS_VEHICULOS ? vehiculos[0]?.id || '' : vehiculoActualId

  let contenidoLista = null
  if (cargandoLista) {
    contenidoLista = (
      <p className="estado-carga" aria-hidden="true">
        <Spinner size={20} />
        Cargando recordatorios…
      </p>
    )
  } else if (!errorLista && visibles.length > 0) {
    contenidoLista = (
      <ul className="recordatorios-lista">
        {visibles.map((recordatorio) => (
          <TarjetaRecordatorio
            key={recordatorio.id}
            recordatorio={recordatorio}
            extraMeta={
              vehiculoActualId === TODOS_LOS_VEHICULOS && recordatorio.vehiculoModelo
                ? ` · ${[recordatorio.vehiculoModelo, recordatorio.vehiculoPlacas].filter(Boolean).join(' ')}`
                : null
            }
          >
            {recordatorio.estado !== 'concluido' && (
              <button
                type="button"
                className="btn btn--secundario btn--sm"
                onClick={() => setPorConcluir(recordatorio)}
                aria-label={`Marcar como hecho: ${recordatorio.titulo}`}
              >
                <Icon name="check" size={16} />
                Hecho
              </button>
            )}
          </TarjetaRecordatorio>
        ))}
      </ul>
    )
  } else if (!errorLista) {
    contenidoLista = (
      <EstadoVacio
        icono={filtro === 'completados' ? 'check-circulo' : 'bell'}
        titulo={filtro === 'completados' ? 'Aún no completas recordatorios' : 'Sin recordatorios en esta vista'}
        texto={
          filtro === 'completados'
            ? 'Cuando marques un recordatorio como hecho aparecerá aquí.'
            : 'Crea un recordatorio para no olvidar trámites y servicios de tu vehículo.'
        }
      >
        <button type="button" className="btn btn--primario" onClick={() => setModalAbierto(true)}>
          <Icon name="plus" size={18} />
          Nuevo recordatorio
        </button>
      </EstadoVacio>
    )
  }

  return (
    <div className="recordatorios-page contenedor">
      <EncabezadoRecordatorios
        vehiculos={vehiculos}
        vehiculoId={vehiculoActualId}
        onCambiarVehiculo={cambiarVehiculo}
        onNuevo={() => setModalAbierto(true)}
        incluirTodos
      />

      <section
        className={sinDatos ? 'recordatorios-resumen sin-datos' : 'recordatorios-resumen'}
        aria-label="Resumen de recordatorios"
        aria-busy={cargandoLista || undefined}
      >
        {CONTADORES.map((contador) => (
          <article key={contador.id} className="recordatorio-stat">
            <span className={`recordatorio-stat-icono ${contador.tono}`} aria-hidden="true">
              <Icon name={contador.icono} size={18} />
            </span>
            <span className="recordatorio-stat-label">{contador.etiqueta}</span>
            <strong className="cifra" aria-label={sinDatos ? 'sin datos' : String(grupos[contador.id].length)}>
              {sinDatos ? '—' : grupos[contador.id].length}
            </strong>
          </article>
        ))}
      </section>

      {errorLista ? (
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
        </Alerta>
      ) : (
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

      <p className="sr-only" role="status">
        {cargandoLista
          ? 'Cargando recordatorios…'
          : `${visibles.length} recordatorio${visibles.length === 1 ? '' : 's'} en la vista actual.`}
      </p>

      {contenidoLista}

      {modalAbierto && (
        <FormularioRecordatorio
          vehiculos={vehiculos}
          vehiculoInicialId={vehiculoFormulario}
          onCerrar={() => setModalAbierto(false)}
          onCreado={alCrear}
        />
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
