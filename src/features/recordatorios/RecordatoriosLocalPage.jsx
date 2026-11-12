import { useEffect, useState } from 'react'
import Icon from '../../components/Icons'
import Alerta from '../../components/Alerta'
import EstadoVacio from '../../components/EstadoVacio'
import { useAviso } from '../../components/Aviso'
import { mensajeError } from '../../utils/mensajes'
import { obtenerResumenVehiculo } from '../vehiculos/vehiculosApi'
import { estadoRecordatorio } from './recordatoriosApi'
import { calcularEstadoLocal, guardarRecordatorioCreado, leerRecordatoriosCreados } from './recordatoriosLocales'
import { detalleFecha, odometroDe, ordenarPorUrgencia } from './recordatoriosUi'
import EncabezadoRecordatorios, { RecordatoriosSinVehiculos } from './EncabezadoRecordatorios'
import FormularioRecordatorio from './FormularioRecordatorio'
import TarjetaRecordatorio from './TarjetaRecordatorio'
import './RecordatoriosPage.css'

function ProximoVencimiento({ sinDatos, proximo }) {
  if (sinDatos) return <strong className="cifra" aria-label="sin datos">—</strong>
  if (!proximo) return <strong className="recordatorio-proximo-titulo">Ninguno</strong>
  return (
    <>
      <strong className="recordatorio-proximo-titulo">{proximo.titulo}</strong>
      <span className="recordatorio-proximo-detalle">{detalleFecha(proximo)}</span>
    </>
  )
}

/**
 * Recordatorios con los endpoints básicos de la API:
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
    .sort(ordenarPorUrgencia)

  const totalPendientes = Number(resumen?.totalRecordatoriosPendientes ?? 0)
  const proximo = resumen?.proximoRecordatorio || null

  const cambiarVehiculo = (id) => {
    setVehiculoElegidoId(id)
    onSeleccionarVehiculo?.(id)
  }

  // La API responde con el recordatorio creado (RecordatorioResponse); se completa con lo enviado.
  const alCrear = (creado, enviados) => {
    const respuesta = Object.fromEntries(Object.entries(creado || {}).filter(([, valor]) => valor != null))
    guardarRecordatorioCreado({
      ...enviados,
      ...respuesta,
      estado: respuesta.estado || 'pendiente',
      creadoEn: respuesta.creadoEn || new Date().toISOString(),
    })
    setCreados(leerRecordatoriosCreados())
    setModalAbierto(false)
    if (enviados.vehiculoId !== vehiculoActualId) cambiarVehiculo(enviados.vehiculoId)
    recargar()
    avisar(`Recordatorio «${enviados.titulo}» creado. Te avisaremos con ${enviados.anticipacionDias} días de anticipación.`)
  }

  if (vehiculos.length === 0) return <RecordatoriosSinVehiculos />

  const sinDatos = cargandoResumen || Boolean(errorResumen)

  return (
    <div className="recordatorios-page contenedor">
      <EncabezadoRecordatorios
        vehiculos={vehiculos}
        vehiculoId={vehiculoActualId}
        onCambiarVehiculo={cambiarVehiculo}
        onNuevo={() => setModalAbierto(true)}
      />

      {/* Resumen del servidor: GET /api/vehiculos/{id}/resumen */}
      <section
        className={`recordatorios-resumen recordatorios-resumen--dos${sinDatos ? ' sin-datos' : ''}`}
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
          <ProximoVencimiento sinDatos={sinDatos} proximo={proximo} />
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
            {lista.map((recordatorio) => (
              <TarjetaRecordatorio key={recordatorio.id} recordatorio={recordatorio} />
            ))}
          </ul>
        ) : (
          <EstadoVacio
            icono="bell"
            titulo="Aún no creas recordatorios aquí"
            texto="Crea uno para el seguro, la verificación o el próximo servicio y aparecerá en esta lista."
          />
        )}

        <p className="proximamente-linea recordatorios-nota">
          <span className="nav-proximamente">Próximamente</span>
          Ver todos tus recordatorios desde cualquier dispositivo y marcarlos como hechos.
        </p>
      </section>

      {modalAbierto && (
        <FormularioRecordatorio
          vehiculos={vehiculos}
          vehiculoInicialId={vehiculoActualId}
          onCerrar={() => setModalAbierto(false)}
          onCreado={alCrear}
        />
      )}
    </div>
  )
}
