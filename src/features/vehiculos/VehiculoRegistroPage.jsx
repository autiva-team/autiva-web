import { useRef, useState } from 'react'
import { registrarVehiculo } from './vehiculosApi'
import Alerta from '../../components/Alerta'
import Spinner from '../../components/Spinner'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
import './VehiculoRegistroPage.css'

export default function VehiculoRegistroPage({ onVolver, onRegistrado }) {
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    anio: '',
    placas: '',
    kilometrajeInicial: '',
    color: '',
  })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)
  const formRef = useRef(null)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'placas' ? value.toUpperCase() : value,
    }))
    if (errores[name]) setErrores((actuales) => ({ ...actuales, [name]: undefined }))
  }

  const validar = () => {
    const e = {}
    const anio = Number(form.anio)
    const km = Number(form.kilometrajeInicial)
    const placas = form.placas.trim()

    if (!form.marca.trim()) e.marca = 'Escribe la marca del vehículo (ej. Nissan).'
    else if (form.marca.trim().length > 50)
      e.marca = 'La marca no puede superar los 50 caracteres.'

    if (!form.modelo.trim()) e.modelo = 'Escribe el modelo del vehículo (ej. Versa).'
    else if (form.modelo.trim().length > 50)
      e.modelo = 'El modelo no puede superar los 50 caracteres.'

    if (!form.anio) e.anio = 'Escribe el año del modelo con 4 dígitos (ej. 2020).'
    else if (!/^\d{4}$/.test(form.anio) || anio < 1900 || anio > 2100)
      e.anio = 'Ingresa un año de 4 dígitos entre 1900 y 2100.'

    if (!placas) e.placas = 'Escribe las placas tal como aparecen en el vehículo.'
    else if (placas.length > 15)
      e.placas = 'Las placas no pueden superar los 15 caracteres.'
    else if (!/^[A-Z0-9-]+$/.test(placas))
      e.placas = 'Las placas solo pueden tener letras, números y guiones.'

    if (form.kilometrajeInicial === '')
      e.kilometrajeInicial = 'Escribe el kilometraje que marca hoy el tablero (ej. 45210).'
    else if (!Number.isInteger(km) || km < 0 || km > 9999999)
      e.kilometrajeInicial = 'Ingresa el kilometraje en kilómetros, sin decimales.'

    if (form.color.trim().length > 30)
      e.color = 'El color no puede superar los 30 caracteres.'

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setErrorApi('')
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }
    if (cargando) return

    setCargando(true)
    try {
      const datos = await registrarVehiculo({
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: Number(form.anio),
        placas: form.placas.trim(),
        kilometrajeInicial: Number(form.kilometrajeInicial),
        color: form.color.trim(),
        fotoUrl: null,
      })
      if (onRegistrado) onRegistrado(datos)
      setForm({
        marca: '',
        modelo: '',
        anio: '',
        placas: '',
        kilometrajeInicial: '',
        color: '',
      })
      setErrores({})
    } catch (err) {
      if (err.status === 409) {
        setErrorApi(
          err.message ||
            'Ya tienes un vehículo con esas placas. Verifica que no esté registrado o corrige las placas.'
        )
      } else {
        setErrorApi(mensajeError(err, 'registrar el vehículo'))
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="vehiculo-registro contenedor contenedor--formulario">
      <EncabezadoPagina
        titulo="Registrar vehículo"
        descripcion="Con estos datos empieza el historial de tu auto. Podrás editarlos después."
        onVolver={onVolver}
      />

      <section className="tarjeta formulario-card">
        <form ref={formRef} className="formulario form-grid" onSubmit={onSubmit} noValidate aria-busy={cargando || undefined}>
          <label>
            Marca
            <input
              name="marca"
              value={form.marca}
              onChange={onChange}
              maxLength={50}
              aria-invalid={errores.marca ? 'true' : undefined}
              aria-describedby={errores.marca ? 'error-marca' : undefined}
              placeholder="Nissan"
            />
            {errores.marca && (
              <span className="error" id="error-marca">
                {errores.marca}
              </span>
            )}
          </label>

          <label>
            Modelo
            <input
              name="modelo"
              value={form.modelo}
              onChange={onChange}
              maxLength={50}
              aria-invalid={errores.modelo ? 'true' : undefined}
              aria-describedby={errores.modelo ? 'error-modelo' : undefined}
              placeholder="Versa"
            />
            {errores.modelo && (
              <span className="error" id="error-modelo">
                {errores.modelo}
              </span>
            )}
          </label>

          <label>
            Año
            <input
              type="text"
              inputMode="numeric"
              name="anio"
              value={form.anio}
              onChange={onChange}
              maxLength={4}
              placeholder="2024"
              aria-invalid={errores.anio ? 'true' : undefined}
              aria-describedby={errores.anio ? 'error-anio' : undefined}
            />
            {errores.anio && (
              <span className="error" id="error-anio">
                {errores.anio}
              </span>
            )}
          </label>

          <label>
            Placas
            <input
              name="placas"
              value={form.placas}
              onChange={onChange}
              maxLength={15}
              placeholder="ABC-1234"
              className="input-placas"
              aria-invalid={errores.placas ? 'true' : undefined}
              aria-describedby={
                errores.placas ? 'error-placas' : 'ayuda-placas'
              }
            />
            <small className="ayuda" id="ayuda-placas">
              Se guardan en mayúsculas, como aparecen en la placa.
            </small>
            {errores.placas && (
              <span className="error" id="error-placas">
                {errores.placas}
              </span>
            )}
          </label>

          <label>
            Kilometraje actual (km)
            <input
              type="number"
              name="kilometrajeInicial"
              value={form.kilometrajeInicial}
              onChange={onChange}
              min="0"
              max="9999999"
              inputMode="numeric"
              placeholder="0"
              aria-invalid={errores.kilometrajeInicial ? 'true' : undefined}
              aria-describedby={
                errores.kilometrajeInicial ? 'error-kilometraje' : undefined
              }
            />
            {errores.kilometrajeInicial && (
              <span className="error" id="error-kilometraje">
                {errores.kilometrajeInicial}
              </span>
            )}
          </label>

          <label>
            <span>Color <span className="campo-opcional">(opcional)</span></span>
            <input
              name="color"
              value={form.color}
              onChange={onChange}
              maxLength={30}
              placeholder="Gris plata"
              aria-invalid={errores.color ? 'true' : undefined}
            />
            {errores.color && (
              <span className="error">
                {errores.color}
              </span>
            )}
          </label>

          <p className="ancho-completo proximamente-linea">
            <span className="nav-proximamente">Próximamente</span>
            Agregar una foto de tu vehículo.
          </p>

          {errorApi && (
            <Alerta tipo="error" titulo="No se registró el vehículo" className="ancho-completo">
              {errorApi}
            </Alerta>
          )}

          <div className="acciones ancho-completo">
            <button type="button" className="btn btn--secundario" onClick={onVolver} disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primario" disabled={cargando} aria-busy={cargando || undefined}>
              {cargando && <Spinner size={16} />}
              {cargando ? 'Registrando…' : 'Registrar vehículo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
