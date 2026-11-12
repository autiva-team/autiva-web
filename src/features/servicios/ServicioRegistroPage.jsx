import { useEffect, useRef, useState } from 'react'
import { registrarServicio } from './serviciosApi'
import { encolarServicio, esErrorDeRed } from '../../offline/syncQueue'
import { obtenerVehiculo } from '../vehiculos/vehiculosApi'
import Alerta from '../../components/Alerta'
import Campo from '../../components/Campo'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import Spinner from '../../components/Spinner'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import './ServicioRegistroPage.css'

const TIPOS_SERVICIO = [
  { id: 1, nombre: 'Cambio de aceite' },
  { id: 2, nombre: 'Frenos' },
  { id: 3, nombre: 'Llantas' },
  { id: 4, nombre: 'Batería' },
  { id: 5, nombre: 'Afinación' },
  { id: 6, nombre: 'Otro' },
]

function hoyIso() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function formVacio() {
  return {
    tipoServicioId: '1',
    fecha: hoyIso(),
    kilometrajeServicio: '',
    costo: '',
    metaProximoKm: '',
    fechaRetorno: '',
    taller: '',
    folio: '',
    notas: '',
  }
}

/**
 * Registro de servicio de mantenimiento.
 * POST /api/vehiculos/{vehiculoId}/servicios (o cola offline → POST /api/sincronizacion).
 */
export default function ServicioRegistroPage({ vehiculoId, onVolver, onGuardado }) {
  const [vehiculo, setVehiculo] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    if (!vehiculoId) return
    obtenerVehiculo(vehiculoId).then(setVehiculo).catch(() => setVehiculo(null))
  }, [vehiculoId])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errores[name]) setErrores((actuales) => ({ ...actuales, [name]: undefined }))
  }

  const validar = () => {
    const e = {}
    const km = Number(form.kilometrajeServicio)
    const costo = Number(form.costo)
    const meta = Number(form.metaProximoKm)

    if (!form.tipoServicioId) e.tipoServicioId = 'Elige qué servicio se le hizo al vehículo.'
    if (!form.fecha) e.fecha = 'Elige la fecha en que se hizo el servicio.'
    if (form.kilometrajeServicio === '' || !Number.isInteger(km) || km < 0)
      e.kilometrajeServicio = 'Escribe el kilometraje del tablero, sin decimales (ej. 45210).'
    if (form.costo === '' || !Number.isFinite(costo) || costo < 0)
      e.costo = 'Escribe el costo total en pesos; usa 0 si fue gratuito.'
    if (form.metaProximoKm !== '' && (!Number.isInteger(meta) || meta < 0))
      e.metaProximoKm = 'Escribe el kilometraje del próximo servicio, sin decimales.'
    else if (form.metaProximoKm !== '' && Number.isInteger(km) && meta <= km)
      e.metaProximoKm = `Debe ser mayor al kilometraje de este servicio (${km.toLocaleString('es-MX')} km).`
    if (form.fechaRetorno && form.fecha && form.fechaRetorno < form.fecha)
      e.fechaRetorno = 'La fecha de regreso debe ser posterior a la fecha del servicio.'
    if (form.taller.trim().length > 120) e.taller = 'Usa máximo 120 caracteres.'
    if (form.folio.trim().length > 50) e.folio = 'Usa máximo 50 caracteres.'
    if (form.notas.trim().length > 500) e.notas = 'Usa máximo 500 caracteres.'

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (cargando) return
    setErrorApi('')
    setExito('')
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }

    setCargando(true)
    try {
      const payload = {
        tipoServicioId: Number(form.tipoServicioId),
        fecha: form.fecha,
        kilometrajeServicio: Number(form.kilometrajeServicio),
        costo: Number(form.costo),
        metaProximoKm: form.metaProximoKm === '' ? null : Number(form.metaProximoKm),
        fechaRetorno: form.fechaRetorno || null,
        taller: form.taller.trim() || null,
        folio: form.folio.trim() || null,
        notas: form.notas.trim() || null,
      }

      let datos
      let pendiente = false
      // HU-018: sin conexión el servicio se guarda en IndexedDB y se envía después.
      try {
        if (!navigator.onLine) throw new Error('Sin conexión')
        datos = await registrarServicio(vehiculoId, payload)
      } catch (errorRegistro) {
        if (!esErrorDeRed(errorRegistro)) throw errorRegistro
        datos = await encolarServicio({ ...payload, vehiculoId })
        pendiente = true
      }

      if (onGuardado) {
        onGuardado(datos, false, pendiente)
        return
      }

      setExito(
        pendiente
          ? 'Sin conexión: el servicio se guardó en tu dispositivo y se enviará al recuperar la conexión.'
          : 'Servicio registrado correctamente.'
      )
      setForm(formVacio())
      setErrores({})
    } catch (err) {
      setErrorApi(mensajeError(err, 'registrar el servicio'))
    } finally {
      setCargando(false)
    }
  }

  const descripcionVehiculo = vehiculo
    ? [`${vehiculo.marca} ${vehiculo.modelo}`, vehiculo.placas].filter(Boolean).join(' · ')
    : 'Servicio de mantenimiento'
  const tieneDetalles = Boolean(form.taller || form.folio || form.notas)

  return (
    <div className="servicio-registro-page contenedor contenedor--formulario">
      <EncabezadoPagina titulo="Registrar servicio" descripcion={descripcionVehiculo} onVolver={onVolver} />

      {exito && <Alerta tipo="exito" titulo={exito} />}

      <section className="tarjeta formulario-card">
        <form ref={formRef} className="formulario" onSubmit={onSubmit} noValidate aria-busy={cargando || undefined}>
          <fieldset className="form-seccion">
            <legend>¿Qué se hizo?</legend>

            <Campo etiqueta="Tipo de servicio" error={errores.tipoServicioId}>
              <select name="tipoServicioId" value={form.tipoServicioId} onChange={onChange}>
                {TIPOS_SERVICIO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Fecha del servicio" error={errores.fecha}>
              <input type="date" name="fecha" value={form.fecha} max={hoyIso()} onChange={onChange} />
            </Campo>

            <Campo etiqueta="Kilometraje del tablero" sufijo="km" error={errores.kilometrajeServicio}>
              <input type="number" inputMode="numeric" name="kilometrajeServicio" value={form.kilometrajeServicio} onChange={onChange} min="0" />
            </Campo>

            <Campo etiqueta="Costo total" prefijo="$" sufijo="MXN" error={errores.costo}>
              <input type="number" inputMode="decimal" step="0.01" name="costo" value={form.costo} onChange={onChange} min="0" placeholder="0.00" />
            </Campo>
          </fieldset>

          <fieldset className="form-seccion">
            <legend>Próximo servicio</legend>

            <Campo
              etiqueta="Kilometraje del próximo servicio"
              opcional
              sufijo="km"
              ayuda="Lo verás como meta en Mantenimiento."
              error={errores.metaProximoKm}
            >
              <input type="number" inputMode="numeric" name="metaProximoKm" value={form.metaProximoKm} onChange={onChange} min="0" />
            </Campo>

            <Campo etiqueta="Fecha de regreso al taller" opcional error={errores.fechaRetorno}>
              <input type="date" name="fechaRetorno" value={form.fechaRetorno} min={form.fecha || undefined} onChange={onChange} />
            </Campo>
          </fieldset>

          <details className="form-detalles" open={tieneDetalles || undefined}>
            <summary>
              Taller, folio y notas <span className="campo-opcional">(opcional)</span>
            </summary>
            <div className="form-grid">
              <Campo etiqueta="Taller" opcional error={errores.taller}>
                <input name="taller" value={form.taller} onChange={onChange} maxLength={120} />
              </Campo>

              <Campo etiqueta="Folio o número de orden" opcional error={errores.folio}>
                <input name="folio" value={form.folio} onChange={onChange} maxLength={50} />
              </Campo>

              <Campo etiqueta="Notas" opcional ayuda="Máximo 500 caracteres." error={errores.notas} className="ancho-completo">
                <textarea name="notas" value={form.notas} onChange={onChange} maxLength={500} rows={3} />
              </Campo>

              <p className="ancho-completo proximamente-linea">
                <span className="nav-proximamente">Próximamente</span>
                Adjuntar foto o PDF del comprobante.
              </p>
            </div>
          </details>

          {errorApi && (
            <Alerta tipo="error" titulo="No se guardó el servicio">
              {errorApi}
            </Alerta>
          )}

          <div className="acciones">
            <button type="button" className="btn btn--secundario" onClick={onVolver} disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primario" disabled={cargando} aria-busy={cargando || undefined}>
              {cargando && <Spinner size={16} />}
              {cargando ? 'Guardando…' : 'Registrar servicio'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
