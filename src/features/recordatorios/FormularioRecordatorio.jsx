import { useRef, useState } from 'react'
import Campo from '../../components/Campo'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import Alerta from '../../components/Alerta'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import { nombreVehiculo } from '../../utils/vehiculo'
import {
  CATEGORIAS_RECORDATORIO,
  TITULOS_SUGERIDOS,
  crearRecordatorioFecha,
  crearRecordatorioKilometraje,
} from './recordatoriosApi'
import { fechaHoy, formVacio, odometroDe, validarRecordatorio } from './recordatoriosUi'

/**
 * Diálogo «Nuevo recordatorio».
 * POST /api/vehiculos/{id}/recordatorios/fecha | /kilometraje
 * Al crear, llama a onCreado(respuestaApi, datosEnviados).
 */
export default function FormularioRecordatorio({ vehiculos, vehiculoInicialId, onCerrar, onCreado }) {
  const [form, setForm] = useState(() => formVacio(vehiculoInicialId))
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const formRef = useRef(null)

  const vehiculoDe = (id) => vehiculos.find((v) => v.id === id)

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
    const nuevos = validarRecordatorio(form, { vehiculoDestino: vehiculoDe(form.vehiculoId) })
    setErrores(nuevos)
    setErrorServidor('')
    if (Object.keys(nuevos).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }

    setGuardando(true)
    const enviados = {
      vehiculoId: form.vehiculoId,
      titulo: form.titulo.trim(),
      tipo: form.categoria,
      criterio: form.tipo === 'fecha' ? 'por_fecha' : 'por_kilometraje',
      fechaLimite: form.tipo === 'fecha' ? form.fecha : null,
      kmObjetivo: form.tipo === 'fecha' ? null : Number(form.kilometraje),
      anticipacionDias: Number(form.anticipacionDias) || 7,
      pushPrioritaria: form.pushPrioritaria,
    }
    try {
      const creado =
        form.tipo === 'fecha'
          ? await crearRecordatorioFecha(form.vehiculoId, enviados)
          : await crearRecordatorioKilometraje(form.vehiculoId, enviados)
      onCreado(creado, enviados)
    } catch (err) {
      setErrorServidor(mensajeError(err, 'guardar el recordatorio'))
    } finally {
      setGuardando(false)
    }
  }

  const vehiculoForm = vehiculoDe(form.vehiculoId)

  return (
    <Modal titulo="Nuevo recordatorio" onCerrar={() => (guardando ? null : onCerrar())}>
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
            ayuda={vehiculoForm ? `Actual: ${odometroDe(vehiculoForm).toLocaleString('es-MX')} km.` : undefined}
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
          <input type="checkbox" name="pushPrioritaria" checked={Boolean(form.pushPrioritaria)} onChange={onChange} />
          <span>Marcar como prioritario</span>
        </label>

        {errorServidor && (
          <Alerta tipo="error" titulo="No se guardó el recordatorio" className="ancho-completo">
            {errorServidor}
          </Alerta>
        )}

        <div className="modal-acciones ancho-completo">
          <button type="button" className="btn btn--secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primario" disabled={guardando} aria-busy={guardando || undefined}>
            {guardando && <Spinner size={16} />}
            {guardando ? 'Guardando…' : 'Guardar recordatorio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
