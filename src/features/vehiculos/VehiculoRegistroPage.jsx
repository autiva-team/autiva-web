import { useState } from 'react'
import { registrarVehiculo } from './vehiculosApi'
import './VehiculoRegistroPage.css'

export default function VehiculoRegistroPage({ onVolver, onRegistrado }) {
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    anio: '',
    placas: '',
    kilometrajeInicial: '',
    color: '',
    fotoUrl: '',
  })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const validar = () => {
    const e = {}
    const anio = Number(form.anio)
    const km = Number(form.kilometrajeInicial)

    if (!form.marca.trim()) e.marca = 'La marca es obligatoria.'
    else if (form.marca.trim().length > 50)
      e.marca = 'La marca no puede superar los 50 caracteres.'

    if (!form.modelo.trim()) e.modelo = 'El modelo es obligatorio.'
    else if (form.modelo.trim().length > 50)
      e.modelo = 'El modelo no puede superar los 50 caracteres.'

    if (!form.anio) e.anio = 'El año es obligatorio.'
    else if (!Number.isInteger(anio) || anio < 1900 || anio > 2100)
      e.anio = 'Ingresa un año válido.'

    if (!form.placas.trim()) e.placas = 'Las placas son obligatorias.'
    else if (form.placas.trim().length > 15)
      e.placas = 'Las placas no pueden superar los 15 caracteres.'

    if (form.kilometrajeInicial === '')
      e.kilometrajeInicial = 'El kilometraje inicial es obligatorio.'
    else if (!Number.isInteger(km) || km < 0)
      e.kilometrajeInicial = 'Ingresa un kilometraje válido.'

    if (form.color.trim().length > 30)
      e.color = 'El color no puede superar los 30 caracteres.'

    if (form.fotoUrl.trim().length > 500)
      e.fotoUrl = 'La URL de la foto no puede superar los 500 caracteres.'

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
        placas: form.placas.trim().toUpperCase(),
        kilometrajeInicial: Number(form.kilometrajeInicial),
        color: form.color.trim(),
        fotoUrl: form.fotoUrl.trim(),
      })
      setExito(`Vehículo registrado: ${datos.marca} ${datos.modelo} (${datos.placas}).`)
      if (onRegistrado) onRegistrado(datos)
      setForm({
        marca: '',
        modelo: '',
        anio: '',
        placas: '',
        kilometrajeInicial: '',
        color: '',
        fotoUrl: '',
      })
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
    <main className="contenedor vehiculo-registro">
      <h1>Autiva</h1>
      <p className="subtitulo">Registrar vehículo</p>
      <form className="tarjeta formulario" onSubmit={onSubmit} noValidate>
        <label>
          Marca
          <input name="marca" value={form.marca} onChange={onChange} />
          {errores.marca && <span className="error">{errores.marca}</span>}
        </label>

        <label>
          Modelo
          <input name="modelo" value={form.modelo} onChange={onChange} />
          {errores.modelo && <span className="error">{errores.modelo}</span>}
        </label>

        <label>
          Año
          <input
            type="number"
            name="anio"
            value={form.anio}
            onChange={onChange}
            min="1900"
            max="2100"
          />
          {errores.anio && <span className="error">{errores.anio}</span>}
        </label>

        <label>
          Placas
          <input name="placas" value={form.placas} onChange={onChange} />
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
          />
          {errores.kilometrajeInicial && (
            <span className="error">{errores.kilometrajeInicial}</span>
          )}
        </label>

        <label>
          Color (opcional)
          <input name="color" value={form.color} onChange={onChange} />
          {errores.color && <span className="error">{errores.color}</span>}
        </label>

        <label>
          Foto (URL, opcional)
          <input name="fotoUrl" value={form.fotoUrl} onChange={onChange} />
          {errores.fotoUrl && <span className="error">{errores.fotoUrl}</span>}
        </label>

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
    </main>
  )
}