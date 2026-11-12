import { useEffect, useState } from 'react'
import Icon from '../../components/Icons'
import Modal from '../../components/Modal'
import Alerta from '../../components/Alerta'
import Campo from '../../components/Campo'
import Spinner from '../../components/Spinner'
import { obtenerRendimiento } from '../cargas/cargasApi'
import { obtenerHistorialServicios } from '../servicios/serviciosApi'
import { obtenerResumenVehiculo } from '../vehiculos/vehiculosApi'
import { estadoRecordatorio, listarRecordatoriosVehiculo } from '../recordatorios/recordatoriosApi'

function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
}
import './PrincipalPage.css'

const acciones = [
  {
    id: 'vehiculos',
    icon: 'car',
    titulo: 'Mis vehículos',
    subtitulo: 'Expediente de cada auto',
  },
  {
    id: 'gasolina',
    icon: 'fuel',
    titulo: 'Combustible',
    subtitulo: 'Cargas y rendimiento',
  },
  {
    id: 'mantenimiento',
    icon: 'wrench',
    titulo: 'Mantenimiento',
    subtitulo: 'Servicios y próximo km',
  },
  {
    id: 'gastos',
    icon: 'wallet',
    titulo: 'Gastos',
    subtitulo: 'Próximamente',
  },
  {
    id: 'recordatorios',
    icon: 'bell',
    titulo: 'Recordatorios',
    subtitulo: 'Trámites y vencimientos',
  },
  {
    id: 'estadisticas',
    icon: 'chart',
    titulo: 'Estadísticas',
    subtitulo: 'Próximamente',
  },
]

function fechaHoy() {
  const texto = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function primerNombre(nombre = '') {
  return nombre.split(' ').filter(Boolean)[0] || 'conductor'
}

function numero(valor) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : 0
}


function extraerRendimiento(datos) {
  if (!datos) return null
  if (Array.isArray(datos)) {
    const valores = datos.map((item) => numero(item?.rendimientoKml)).filter((valor) => valor > 0)
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

function formatearFechaCorta(fecha) {
  if (!fecha) return ''
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function PrincipalPage({
  usuario,
  vehiculos = [],
  fotos = {},
  homeEstado,
  onNavegar,
  onRegistrarVehiculo,
  onActualizarOdometro,
  instalable = false,
  onInstalar,
  onAccionRapida,
}) {
  const [rendimiento, setRendimiento] = useState(null)
  const [ultimoServicio, setUltimoServicio] = useState(null)
  const [resumenVehiculo, setResumenVehiculo] = useState(null)
  const [modalOdometro, setModalOdometro] = useState(false)
  const [odometroNuevo, setOdometroNuevo] = useState('')
  const [errorOdometro, setErrorOdometro] = useState('')
  const [guardandoOdometro, setGuardandoOdometro] = useState(false)
  const [recordatorios, setRecordatorios] = useState([])

  const vehiculoActivo =
    vehiculos.find((item) => item.esPrincipal) || vehiculos[0] || null
  const totalVehiculos = vehiculos.length
  const fotoActiva = vehiculoActivo ? fotos[vehiculoActivo.id] : ''
  const odometroActual = vehiculoActivo
    ? numero(vehiculoActivo.odometroActual ?? vehiculoActivo.kilometrajeInicial)
    : 0
  const vehiculoActivoId = vehiculoActivo?.id

  useEffect(() => {
    if (!vehiculoActivoId) return undefined

    let activo = true
    obtenerRendimiento(vehiculoActivoId)
      .then((datos) => {
        if (activo) setRendimiento(datos)
      })
      .catch(() => {
        if (activo) setRendimiento(null)
      })
    obtenerHistorialServicios(vehiculoActivoId, 1, 1)
      .then((datos) => {
        if (activo) setUltimoServicio(datos?.items?.[0] || null)
      })
      .catch(() => {
        if (activo) setUltimoServicio(null)
      })
    listarRecordatoriosVehiculo(vehiculoActivoId, { estado: 'pendiente' })
      .then((datos) => {
        if (activo) setRecordatorios(Array.isArray(datos) ? datos : [])
      })
      .catch(() => {
        if (activo) setRecordatorios([])
      })
    obtenerResumenVehiculo(vehiculoActivoId)
      .then((datos) => {
        if (activo) setResumenVehiculo(datos)
      })
      .catch(() => {
        if (activo) setResumenVehiculo(null)
      })

    return () => {
      activo = false
    }
  }, [vehiculoActivoId])

  const rendimientoValor = vehiculoActivoId ? extraerRendimiento(rendimiento) : null
  // GET /api/vehiculos/{id}/cargas/rendimiento → gastoMesActual (combustible del mes).
  const gastoMes = numero(rendimiento?.gastoMesActual)

  const recordatoriosVigentes = recordatorios
    .filter((recordatorio) => recordatorio.estado !== 'concluido')
    .map((recordatorio) => ({ ...recordatorio, estadoUi: estadoRecordatorio(recordatorio) }))
  const alertas = recordatoriosVigentes.filter((recordatorio) =>
    ['vencido', 'proximo'].includes(recordatorio.estadoUi.tono)
  )
  const seguro = recordatoriosVigentes.find((recordatorio) => recordatorio.tipo === 'seguro')

  const proximoKm = vehiculoActivoId ? numero(ultimoServicio?.metaProximoKm) : 0
  const kmServicio = vehiculoActivoId ? numero(ultimoServicio?.kilometrajeServicio) : 0
  const faltanKm = Math.max(0, proximoKm - odometroActual)
  const avanceMantenimiento =
    proximoKm > kmServicio
      ? Math.min(100, Math.max(0, ((odometroActual - kmServicio) / (proximoKm - kmServicio)) * 100))
      : 0

  const abrirModalOdometro = () => {
    setOdometroNuevo(String(odometroActual))
    setErrorOdometro('')
    setModalOdometro(true)
  }

  const guardarOdometro = async (evento) => {
    evento.preventDefault()
    const valor = Number(odometroNuevo)

    if (!Number.isInteger(valor) || valor < 0) {
      setErrorOdometro('Ingresa el odómetro en kilómetros, sin decimales.')
      return
    }
    if (valor < odometroActual) {
      setErrorOdometro(`El odómetro no puede ser menor al actual (${odometroActual.toLocaleString('es-MX')} km).`)
      return
    }

    setGuardandoOdometro(true)
    try {
      if (onActualizarOdometro) await onActualizarOdometro(vehiculoActivo.id, valor)
      setModalOdometro(false)
    } finally {
      setGuardandoOdometro(false)
    }
  }

  const alertasPendientes = resumenVehiculo?.totalRecordatoriosPendientes ?? alertas.length

  return (
    <div className="dashboard contenedor">
      <section className="saludo" aria-labelledby="titulo-saludo">
        <div>
          <p className="eyebrow">{fechaHoy()}</p>
          <h1 id="titulo-saludo">Hola, {primerNombre(usuario?.nombre)}</h1>
          <p className="saludo-texto">
            {totalVehiculos > 0
              ? '¿Qué quieres anotar hoy? Mantener tu bitácora al día te da cálculos más precisos.'
              : 'Empieza registrando tu vehículo; después podrás anotar cargas y servicios.'}
          </p>
        </div>
        {vehiculoActivo && onAccionRapida && (
          <div className="saludo-acciones">
            <button type="button" className="btn btn--primario btn--lg" onClick={() => onAccionRapida('carga')}>
              <Icon name="fuel" size={20} />
              Registrar carga
            </button>
            <button type="button" className="btn btn--secundario btn--lg" onClick={() => onAccionRapida('servicio')}>
              <Icon name="wrench" size={20} />
              Registrar servicio
            </button>
          </div>
        )}
      </section>

      {vehiculoActivo && alertasPendientes > 0 && (
        <Alerta
          tipo="aviso"
          className="dashboard-aviso"
          titulo={`Tienes ${alertasPendientes} recordatorio${alertasPendientes === 1 ? '' : 's'} pendiente${alertasPendientes === 1 ? '' : 's'}`}
          accion={
            <button type="button" className="btn btn--secundario btn--sm" onClick={() => onNavegar('recordatorios')}>
              Revisar recordatorios
            </button>
          }
        >
          Atenderlos a tiempo evita multas y fallas costosas.
        </Alerta>
      )}

      {vehiculoActivo ? (
        <section className="vehiculo-activo tarjeta" aria-label={`Vehículo principal: ${vehiculoActivo.marca} ${vehiculoActivo.modelo}`}>
          {fotoActiva && (
            <img
              src={fotoActiva}
              alt={`${vehiculoActivo.marca} ${vehiculoActivo.modelo}`}
              className="vehiculo-foto-banner"
            />
          )}

          <div className="vehiculo-head">
            <div>
              <h2>
                {vehiculoActivo.marca} {vehiculoActivo.modelo}
              </h2>
              <div className="vehiculo-meta">
                {vehiculoActivo.placas && (
                  <span className="placa">
                    <span className="sr-only">Placas: </span>
                    {vehiculoActivo.placas}
                  </span>
                )}
                <span className="badge badge--primario">
                  {vehiculoActivo.esPrincipal ? 'Principal' : 'Activo'}
                </span>
                {vehiculoActivo.estatus && vehiculoActivo.estatus.toLowerCase() !== 'activo' && (
                  <span className="badge badge--aviso">{vehiculoActivo.estatus}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              onClick={() => onNavegar('vehiculos')}
            >
              Ver expediente
              <Icon name="chevron-derecha" size={16} />
            </button>
          </div>

          <div className="odometro">
            <div>
              <span className="odometro-label">Odómetro actual</span>
              <strong className="cifra">
                {odometroActual.toLocaleString('es-MX')} <small>km</small>
              </strong>
            </div>
            <div className="odometro-acciones">
              <span className="badge">
                <Icon name="car" size={14} />
                {vehiculoActivo.anio}
              </span>
              <button type="button" className="btn btn--secundario btn--sm" onClick={abrirModalOdometro}>
                Actualizar odómetro
              </button>
            </div>
          </div>

          <div className="inspeccion">
            <span
              className={String(vehiculoActivo.estatus).toLowerCase() === 'en taller' ? 'punto-amarillo' : 'punto-verde'}
              aria-hidden="true"
            />
            <span>Estatus del vehículo</span>
            <strong className={String(vehiculoActivo.estatus).toLowerCase() === 'en taller' ? 'texto-aviso' : 'texto-exito'}>
              <span className="capitalizar-primera">{vehiculoActivo.estatus || 'activo'}</span>
            </strong>
          </div>
        </section>
      ) : (
        <section className="estado-vacio">
          <span className="estado-vacio-icono" aria-hidden="true">
            <Icon name="car" size={26} />
          </span>
          <h2>Registra tu primer vehículo</h2>
          <p>Con marca, modelo, año y odómetro es suficiente. Toma menos de un minuto.</p>
          <button type="button" className="btn btn--primario btn--lg" onClick={onRegistrarVehiculo}>
            <Icon name="plus" size={20} />
            Registrar vehículo
          </button>
        </section>
      )}

      {vehiculoActivo && (
        <section className="seccion" aria-labelledby="titulo-resumen">
          <div className="seccion-head">
            <h2 id="titulo-resumen">Resumen de este mes</h2>
          </div>
          <div className="resumen-grid">
            <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('gasolina')}>
              <span className={rendimientoValor ? "icono-tono tono-verde" : "icono-tono tono-azul"}>
                <Icon name="fuel" size={20} />
              </span>
              <span className="resumen-label">Rendimiento</span>
              <strong className="resumen-valor">
                {rendimientoValor ? `${rendimientoValor.toFixed(1)} km/L` : '—'}
              </strong>
              <span className="resumen-hint">
                {resumenVehiculo?.totalCargas
                  ? `${resumenVehiculo.totalCargas} carga${resumenVehiculo.totalCargas === 1 ? '' : 's'} registrada${resumenVehiculo.totalCargas === 1 ? '' : 's'}`
                  : 'Promedio del vehículo'}
              </span>
            </button>

            <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('mantenimiento')}>
              <span className={proximoKm > 0 && faltanKm <= 1000 ? "icono-tono tono-ambar" : "icono-tono tono-azul"}>
                <Icon name="wrench" size={20} />
              </span>
              <span className="resumen-label">Próximo mantenimiento</span>
              <strong className="resumen-valor">
                {proximoKm > 0 ? `${proximoKm.toLocaleString('es-MX')} km` : 'Sin meta'}
              </strong>
              {proximoKm > kmServicio && (
                <span className="mini-barra" aria-hidden="true">
                  <span style={{ width: `${avanceMantenimiento}%` }} />
                </span>
              )}
              <span className="resumen-hint">
                {proximoKm > 0
                  ? `Faltan ${faltanKm.toLocaleString('es-MX')} km`
                  : (resumenVehiculo?.totalServicios
                      ? `${resumenVehiculo.totalServicios} servicio${resumenVehiculo.totalServicios === 1 ? '' : 's'} registrado${resumenVehiculo.totalServicios === 1 ? '' : 's'}`
                      : 'Registra un servicio para calcularlo')}
              </span>
            </button>

            <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('gasolina')}>
              <span className="icono-tono tono-azul">
                <Icon name="wallet" size={20} />
              </span>
              <span className="resumen-label">Combustible del mes</span>
              <strong className="resumen-valor">{formatearMoneda(gastoMes)}</strong>
              <span className="resumen-hint">Total de tus cargas de este mes</span>
            </button>

            <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('recordatorios')}>
              <span className={alertasPendientes > 0 ? 'icono-tono tono-ambar' : 'icono-tono tono-verde'}>
                <Icon name="bell" size={20} />
              </span>
              <span className="resumen-label">Alertas</span>
              <strong className="resumen-valor">
                {alertasPendientes > 0 ? `${alertasPendientes}` : 'Al día'}
              </strong>
              <span className="resumen-hint">
                {alertasPendientes > 0
                  ? 'Recordatorios pendientes'
                  : 'No tienes vencimientos cercanos'}
              </span>
            </button>

            {resumenVehiculo?.proximoRecordatorio && (
              <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('recordatorios')}>
                <span className="icono-tono tono-ambar">
                  <Icon name="spark" size={20} />
                </span>
                <span className="resumen-label">Próximo recordatorio</span>
                <strong className="resumen-valor">{resumenVehiculo.proximoRecordatorio.titulo}</strong>
                <span className="resumen-hint">
                  {resumenVehiculo.proximoRecordatorio.fechaLimite
                    ? `Vence: ${formatearFechaCorta(resumenVehiculo.proximoRecordatorio.fechaLimite)}`
                    : `Meta: ${Number(resumenVehiculo.proximoRecordatorio.kmObjetivo).toLocaleString('es-MX')} km`}
                </span>
              </button>
            )}

            <button type="button" className="resumen-card tarjeta tarjeta--clicable" onClick={() => onNavegar('recordatorios')}>
              <span className="icono-tono tono-verde">
                <Icon name="shield" size={20} />
              </span>
              <span className="resumen-label">Seguro</span>
              <strong className="resumen-valor">
                {seguro ? seguro.estadoUi.etiqueta : 'Sin registrar'}
              </strong>
              <span className="resumen-hint">
                {seguro
                  ? seguro.estadoUi.detalle
                  : 'Crea un recordatorio con la fecha de vencimiento de tu póliza'}
              </span>
              {seguro?.fechaLimite && <span className="resumen-fecha">{formatearFechaCorta(seguro.fechaLimite)}</span>}
            </button>
          </div>
        </section>
      )}

      <section className="seccion" aria-labelledby="titulo-gestion">
        <div className="seccion-head">
          <h2 id="titulo-gestion">Consultar</h2>
        </div>
        <ul className="grid-acciones">
          {acciones.map((accion) => (
            <li key={accion.id}>
              <button
                type="button"
                className="accion-card"
                onClick={() => onNavegar(accion.id)}
              >
                <span className="icono-tono tono-azul" aria-hidden="true">
                  <Icon name={accion.icon} size={20} />
                </span>
                <span className="accion-texto">
                  <span className="accion-titulo">{accion.titulo}</span>
                  <span className="accion-subtitulo">{accion.subtitulo}</span>
                </span>
                <Icon name="chevron-derecha" size={18} className="accion-flecha" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="seccion pie-dashboard" aria-label="Estado de la aplicación">
        <div className="sincronizacion-card" role="status">
          <span className={homeEstado ? 'punto-verde' : 'punto-amarillo'} aria-hidden="true" />
          <div>
            <strong>{homeEstado ? 'Tu expediente está al día' : 'Trabajando sin conexión al servidor'}</strong>
            <p>
              {homeEstado
                ? 'Todo lo que registres se guarda en tu cuenta al instante.'
                : 'Puedes seguir registrando cargas y servicios; se enviarán al reconectarte.'}
            </p>
          </div>
        </div>

        <div className="instalar-card">
          <span className="icono-tono tono-azul" aria-hidden="true">
            <Icon name="descargar" size={20} />
          </span>
          <div>
            <h2>Instala Autiva</h2>
            <p>Ábrela desde tu pantalla de inicio, como cualquier app, incluso sin conexión.</p>
          </div>
          <button type="button" className="btn btn--secundario" onClick={onInstalar}>
            {instalable ? 'Instalar' : 'Cómo instalarla'}
          </button>
        </div>
      </section>

      {modalOdometro && vehiculoActivo && (
        <Modal titulo="Actualizar odómetro" onCerrar={() => setModalOdometro(false)}>
          <p className="modal-texto">
            {vehiculoActivo.marca} {vehiculoActivo.modelo} · {vehiculoActivo.placas}
          </p>
          <form className="formulario" onSubmit={guardarOdometro} noValidate>
            <Campo
              etiqueta="Kilometraje actual"
              sufijo="km"
              ayuda={`Último registro: ${odometroActual.toLocaleString('es-MX')} km. Escribe el número que muestra tu tablero.`}
              error={errorOdometro}
            >
              <input
                type="number"
                inputMode="numeric"
                min={odometroActual}
                value={odometroNuevo}
                onChange={(evento) => {
                  setOdometroNuevo(evento.target.value)
                  if (errorOdometro) setErrorOdometro('')
                }}
              />
            </Campo>
            <div className="modal-acciones">
              <button type="button" className="btn btn--secundario" onClick={() => setModalOdometro(false)} disabled={guardandoOdometro}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primario" disabled={guardandoOdometro} aria-busy={guardandoOdometro || undefined}>
                {guardandoOdometro && <Spinner size={16} />}
                {guardandoOdometro ? 'Guardando…' : 'Guardar kilometraje'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
