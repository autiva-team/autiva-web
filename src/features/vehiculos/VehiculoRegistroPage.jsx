import { useState } from 'react'
import { registrarVehiculo } from './vehiculosApi'
import './VehiculoRegistroPage.css'

const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result)
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    lector.readAsDataURL(archivo)
  })
}

export default function VehiculoRegistroPage({ onVolver, onRegistrado }) {
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    anio: '',
    placas: '',
    kilometrajeInicial: '',
    color: '',
  })
  const [fotoPreview, setFotoPreview] = useState('')
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'placas' ? value.toUpperCase() : value,
    }))
  }

  const onFotoChange = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) {
      setFotoPreview('')
      return
    }

    if (!archivo.type.startsWith('image/')) {
      setErrorApi('Selecciona un archivo de imagen válido.')
      e.target.value = ''
      return
    }

    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      setErrorApi('La imagen no puede superar los 2 MB.')
      e.target.value = ''
      return
    }

    try {
      const dataUrl = await leerArchivoComoDataUrl(archivo)
      setFotoPreview(dataUrl)
      setErrorApi('')
    } catch {
      setErrorApi('No se pudo leer la imagen seleccionada.')
      e.target.value = ''
    }
  }

  const validar = () => {
    const e = {}
    const anio = Number(form.anio)
    const km = Number(form.kilometrajeInicial)
    const placas = form.placas.trim()

    if (!form.marca.trim()) e.marca = 'La marca es obligatoria.'
    else if (form.marca.trim().length > 50)
      e.marca = 'La marca no puede superar los 50 caracteres.'

    if (!form.modelo.trim()) e.modelo = 'El modelo es obligatorio.'
    else if (form.modelo.trim().length > 50)
      e.modelo = 'El modelo no puede superar los 50 caracteres.'

    if (!form.anio) e.anio = 'El año es obligatorio.'
    else if (!/^\d{4}$/.test(form.anio) || anio < 1900 || anio > 2100)
      e.anio = 'Ingresa un año válido de 4 dígitos.'

    if (!placas) e.placas = 'Las placas son obligatorias.'
    else if (placas.length > 15)
      e.placas = 'Las placas no pueden superar los 15 caracteres.'
    else if (!/^[A-Z0-9-]+$/.test(placas))
      e.placas = 'Las placas solo pueden tener letras, números y guiones.'

    if (form.kilometrajeInicial === '')
      e.kilometrajeInicial = 'El kilometraje inicial es obligatorio.'
    else if (!Number.isInteger(km) || km < 0 || km > 9999999)
      e.kilometrajeInicial = 'Ingresa un kilometraje válido.'

    if (form.color.trim().length > 30)
      e.color = 'El color no puede superar los 30 caracteres.'

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setErrorApi('')
    setExito('')
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) return

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
      setExito(`Vehículo registrado: ${datos.marca} ${datos.modelo} (${datos.placas}).`)
      if (onRegistrado) onRegistrado(datos, fotoPreview)
      setForm({
        marca: '',
        modelo: '',
        anio: '',
        placas: '',
        kilometrajeInicial: '',
        color: '',
      })
      setFotoPreview('')
      setErrores({})
    } catch (err) {
      if (err.status === 409) {
        setErrorApi(err.message || 'Ya existe un vehículo con esas placas.')
      } else if (err.errores && err.errores.length) {
        setErrorApi(err.errores.join(' '))
      } else if (!err.status) {
        setErrorApi(
          'No se pudo conectar con la API. Verifica que el backend esté en ejecución (https://localhost:7043).'
        )
      } else {
        setErrorApi(err.message || 'No se pudo registrar el vehículo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="vehiculo-registro">
      <section className="page-head">
        <div>
          <h2>Registrar vehículo</h2>
          <p>Completa los datos para crear su expediente digital.</p>
        </div>
      </section>

      <section className="tarjeta formulario-card">
        <form className="formulario form-grid" onSubmit={onSubmit} noValidate>
          <label>
            Marca
            <input name="marca" value={form.marca} onChange={onChange} maxLength={50} />
            {errores.marca && <span className="error">{errores.marca}</span>}
          </label>

          <label>
            Modelo
            <input name="modelo" value={form.modelo} onChange={onChange} maxLength={50} />
            {errores.modelo && <span className="error">{errores.modelo}</span>}
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
            />
            {errores.anio && <span className="error">{errores.anio}</span>}
          </label>

          <label>
            Placas
            <input
              name="placas"
              value={form.placas}
              onChange={onChange}
              maxLength={15}
              placeholder="ABC-1234"
              style={{ textTransform: 'uppercase' }}
            />
            {errores.placas && <span className="error">{errores.placas}</span>}
          </label>

          <label>
            Kilometraje inicial
            <input
              type="number"
              name="kilometrajeInicial"
              value={form.kilometrajeInicial}
              onChange={onChange}
              min="0"
              max="9999999"
            />
            {errores.kilometrajeInicial && (
              <span className="error">{errores.kilometrajeInicial}</span>
            )}
          </label>

          <label>
            Color (opcional)
            <input name="color" value={form.color} onChange={onChange} maxLength={30} />
            {errores.color && <span className="error">{errores.color}</span>}
          </label>

          <label className="ancho-completo">
            Foto (opcional)
            <input
              type="file"
              accept="image/*"
              onChange={onFotoChange}
            />
            <small className="ayuda">Selecciona una imagen de tu dispositivo (máx. 2 MB).</small>
          </label>

          {fotoPreview && (
            <div className="ancho-completo foto-preview-contenedor">
              <img src={fotoPreview} alt="Vista previa del vehículo" className="foto-preview" />
              <button
                type="button"
                className="secundario foto-quitar"
                onClick={() => setFotoPreview('')}
              >
                Quitar foto
              </button>
            </div>
          )}

          {errorApi && <p className="error">{errorApi}</p>}
          {exito && <p className="exito">{exito}</p>}

          <div className="acciones">
            <button type="button" className="secundario" onClick={onVolver}>
              Volver
            </button>
            <button type="submit" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Registrar vehículo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
