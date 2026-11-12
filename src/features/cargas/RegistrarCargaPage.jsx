import { useEffect, useRef, useState } from 'react'
import { registrarCarga } from '../cargas/cargasApi'
import { encolarCarga, esErrorDeRed } from '../../offline/syncQueue'
import { obtenerVehiculo } from '../vehiculos/vehiculosApi'
import Alerta from '../../components/Alerta'
import Campo from '../../components/Campo'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import Spinner from '../../components/Spinner'
import './RegistrarCargaPage.css'

const TIPOS_COMBUSTIBLE = [
  { id: 1, nombre: 'Gasolina regular' },
  { id: 2, nombre: 'Gasolina premium' },
  { id: 3, nombre: 'Diésel' },
]

function formVacio() {
  return {
    tipoCombustibleId: '1',
    litros: '',
    costoTotal: '',
    odometro: '',
    tanqueLleno: true,
    fechaHora: '',
    gasolinera: '',
    folio: '',
    notas: '',
  }
}

export default function RegistrarCargaPage({ vehiculoId, onVolver, onGuardado }) {
  const [vehiculo, setVehiculo] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [resultado, setResultado] = useState(null)
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    if (!vehiculoId) return
    obtenerVehiculo(vehiculoId)
      .then(setVehiculo)
      .catch(() => setVehiculo(null))
  }, [vehiculoId])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const validar = () => {
    const e = {}
    const litros = Number(form.litros)
    const costo = Number(form.costoTotal)
    const odometro = Number(form.odometro)

    const base = Number(vehiculo?.odometroActual ?? vehiculo?.kilometrajeInicial ?? 0)

    if (!form.tipoCombustibleId) e.tipoCombustibleId = 'Elige el tipo de combustible que cargaste.'
    if (form.litros === '' || !Number.isFinite(litros) || litros <= 0)
      e.litros = 'Escribe cuántos litros cargaste; debe ser mayor a cero (ej. 35.5).'
    if (form.costoTotal === '' || !Number.isFinite(costo) || costo <= 0)
      e.costoTotal = 'Escribe el total pagado en pesos; debe ser mayor a cero (ej. 850).'
    if (form.odometro === '' || !Number.isInteger(odometro) || odometro < 0)
      e.odometro = 'Escribe el kilometraje del tablero, sin decimales (ej. 45210).'
    else if (base > 0 && odometro < base)
      e.odometro = `Es menor al último kilometraje registrado (${base.toLocaleString('es-MX')} km). Revisa el número del tablero.`
    if (form.gasolinera.trim().length > 100)
      e.gasolinera = 'Máximo 100 caracteres.'
    if (form.folio.trim().length > 50) e.folio = 'Máximo 50 caracteres.'
    if (form.notas.trim().length > 300) e.notas = 'Máximo 300 caracteres.'

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setErrorApi('')
    setResultado(null)
    setExito('')
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }
    if (cargando) return

    setCargando(true)
    try {
      const payload = {
        tipoCombustibleId: Number(form.tipoCombustibleId),
        litros: Number(form.litros),
        costoTotal: Number(form.costoTotal),
        odometro: Number(form.odometro),
        tanqueLleno: form.tanqueLleno,
        fechaHora: form.fechaHora ? new Date(form.fechaHora).toISOString() : undefined,
        gasolinera: form.gasolinera.trim() || null,
        folio: form.folio.trim() || null,
        notas: form.notas.trim() || null,
      }

      // HU-018: sin conexión la carga se guarda en IndexedDB y se envía después.
      let datos
      try {
        if (!navigator.onLine) throw new Error('Sin conexión')
        datos = await registrarCarga(vehiculoId, payload)
      } catch (errorRegistro) {
        if (!esErrorDeRed(errorRegistro)) throw errorRegistro
        const pendiente = await encolarCarga({ ...payload, vehiculoId })
        if (onGuardado) {
          onGuardado(pendiente, false, true)
          return
        }
        setExito('Sin conexión: la carga se guardó en tu dispositivo y se enviará al recuperar la conexión.')
        setForm(formVacio())
        return
      }

      try {
        const key = `autiva_cargas_${vehiculoId}`
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        prev.unshift(datos)
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 20)))
      } catch {
        // Ignora errores de cache local.
      }

      if (onGuardado) {
        onGuardado(datos)
        return
      }

      setResultado(datos)
      setForm(formVacio())
    } catch (err) {
      setErrorApi(mensajeError(err, 'registrar la carga'))
    } finally {
      setCargando(false)
    }
  }

  const litros = Number(form.litros)
  const costo = Number(form.costoTotal)
  const odometro = Number(form.odometro)
  const odometroBase = Number(vehiculo?.odometroActual ?? vehiculo?.kilometrajeInicial ?? 0)
  const precioPorLitro = litros > 0 && costo > 0 ? costo / litros : 0
  const kmEstimados = odometro > odometroBase ? odometro - odometroBase : 0
  const rendimientoEstimado = litros > 0 && kmEstimados > 0 ? kmEstimados / litros : 0

  const moneda = (valor) =>
    valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const descripcionVehiculo = vehiculo
    ? [`${vehiculo.marca} ${vehiculo.modelo}`, vehiculo.placas].filter(Boolean).join(' · ')
    : 'Carga de combustible'
  const tieneDetalles = Boolean(form.fechaHora || form.gasolinera || form.folio || form.notas)

  return (
    <div className="registrar-carga-page contenedor contenedor--formulario">
      <EncabezadoPagina
        titulo="Registrar carga"
        descripcion={descripcionVehiculo}
        onVolver={onVolver}
      />

      <>
          {exito && <Alerta tipo="exito" titulo={exito} />}

          {resultado && (
            <section className="carga-resultado" aria-labelledby="titulo-resultado-carga">
              <h2 id="titulo-resultado-carga">Carga registrada</h2>
              <dl className="carga-datos">
                <div>
                  <dt>Tipo</dt>
                  <dd>{resultado.tipoCombustible}</dd>
                </div>
                <div>
                  <dt>Litros</dt>
                  <dd>{resultado.litros}</dd>
                </div>
                <div>
                  <dt>Precio por litro</dt>
                  <dd>${resultado.precioPorLitro}</dd>
                </div>
                <div>
                  <dt>Km recorridos</dt>
                  <dd>{resultado.kmRecorridos ?? '—'}</dd>
                </div>
                <div>
                  <dt>Rendimiento</dt>
                  <dd>{resultado.rendimientoKml ? `${resultado.rendimientoKml} km/L` : '—'}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="tarjeta formulario-card">
            <form
              ref={formRef}
              className="formulario"
              onSubmit={onSubmit}
              noValidate
              aria-busy={cargando || undefined}
            >
              <fieldset className="form-seccion">
                <legend>Datos de la carga</legend>

                <Campo etiqueta="Tipo de combustible" error={errores.tipoCombustibleId} className="ancho-completo">
                  <select name="tipoCombustibleId" value={form.tipoCombustibleId} onChange={onChange}>
                    {TIPOS_COMBUSTIBLE.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo etiqueta="Litros" sufijo="L" error={errores.litros}>
                  <input type="number" inputMode="decimal" step="0.01" min="0" name="litros" value={form.litros} onChange={onChange} placeholder="0.00" />
                </Campo>

                <Campo etiqueta="Total pagado" prefijo="$" sufijo="MXN" error={errores.costoTotal}>
                  <input type="number" inputMode="decimal" step="0.01" min="0" name="costoTotal" value={form.costoTotal} onChange={onChange} placeholder="0.00" />
                </Campo>

                <Campo
                  etiqueta="Kilometraje del tablero"
                  sufijo="km"
                  ayuda={odometroBase > 0 ? `Último registro: ${odometroBase.toLocaleString('es-MX')} km.` : 'El número que marca el odómetro al cargar.'}
                  error={errores.odometro}
                >
                  <input type="number" inputMode="numeric" min="0" name="odometro" value={form.odometro} onChange={onChange} />
                </Campo>

                <label className="campo-check">
                  <input type="checkbox" name="tanqueLleno" checked={form.tanqueLleno} onChange={onChange} />
                  Llené el tanque
                </label>
              </fieldset>

              {(precioPorLitro > 0 || rendimientoEstimado > 0) && (
                <div className="carga-live" aria-live="polite">
                  {precioPorLitro > 0 && (
                    <span>
                      <small>Precio por litro</small>
                      <strong className="cifra">{moneda(precioPorLitro)}</strong>
                    </span>
                  )}
                  {rendimientoEstimado > 0 && (
                    <span>
                      <small>Rendimiento estimado</small>
                      <strong className="cifra">{rendimientoEstimado.toFixed(1)} km/L</strong>
                    </span>
                  )}
                  {rendimientoEstimado > 0 && (
                    <span className="carga-live-nota">
                      Calculado con {kmEstimados.toLocaleString('es-MX')} km desde el último registro.
                    </span>
                  )}
                </div>
              )}

              <details className="form-detalles" open={tieneDetalles || undefined}>
                <summary>
                  Agregar detalles <span className="campo-opcional">(opcional)</span>
                </summary>
                <div className="form-grid">
                  <Campo etiqueta="Fecha y hora" ayuda="Si lo dejas vacío, se usa el momento actual." opcional>
                    <input type="datetime-local" name="fechaHora" value={form.fechaHora} onChange={onChange} />
                  </Campo>

                  <Campo etiqueta="Gasolinera" opcional error={errores.gasolinera}>
                    <input name="gasolinera" value={form.gasolinera} onChange={onChange} maxLength={100} />
                  </Campo>

                  <Campo etiqueta="Folio del ticket" opcional error={errores.folio}>
                    <input name="folio" value={form.folio} onChange={onChange} maxLength={50} />
                  </Campo>

                  <Campo etiqueta="Notas" opcional ayuda="Máximo 300 caracteres." error={errores.notas} className="ancho-completo">
                    <textarea name="notas" value={form.notas} onChange={onChange} maxLength={300} rows={3} />
                  </Campo>
                </div>
              </details>

              {errorApi && (
                <Alerta tipo="error" titulo="No se guardó la carga">
                  {errorApi}
                </Alerta>
              )}

              <div className="acciones">
                <button type="button" className="btn btn--secundario" onClick={onVolver} disabled={cargando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primario" disabled={cargando} aria-busy={cargando || undefined}>
                  {cargando && <Spinner size={16} />}
                  {cargando ? 'Guardando…' : 'Registrar carga'}
                </button>
              </div>
            </form>
          </section>

      </>
    </div>
  )
}
