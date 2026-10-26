import { useState } from 'react'
import { registrarUsuario } from './authApi'
import AppShell from '../../components/AppShell'
import { validarEmail } from '../../utils/validaciones'
import './RegistroPage.css'

export default function RegistroPage({ onIrALogin }) {
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    confirmar: '',
  })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [exito, setExito] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const validar = () => {
    const e = {}
    const nombre = form.nombre.trim()
    const correo = form.correo.trim()

    if (!nombre) {
      e.nombre = 'El nombre es obligatorio.'
    } else if (nombre.length > 100) {
      e.nombre = 'El nombre no puede superar los 100 caracteres.'
    }

    if (!correo) {
      e.correo = 'El correo es obligatorio.'
    } else if (!validarEmail(correo)) {
      e.correo = 'El correo no tiene un formato válido.'
    } else if (correo.length > 150) {
      e.correo = 'El correo no puede superar los 150 caracteres.'
    }

    if (!form.contrasena) {
      e.contrasena = 'La contraseña es obligatoria.'
    } else if (form.contrasena.length < 8) {
      e.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    } else if (form.contrasena.length > 72) {
      e.contrasena = 'La contraseña no puede superar los 72 caracteres.'
    }

    if (!form.confirmar) {
      e.confirmar = 'Confirma tu contraseña.'
    } else if (form.confirmar !== form.contrasena) {
      e.confirmar = 'Las contraseñas no coinciden.'
    }

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setErrorApi('')
    setExito(false)
    setMensaje('')

    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) return

    setCargando(true)
    try {
      const datos = await registrarUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena,
      })
      setExito(true)
      setMensaje(`Cuenta creada correctamente. Bienvenido, ${datos.nombre}.`)
      setForm({ nombre: '', correo: '', contrasena: '', confirmar: '' })
      setErrores({})
    } catch (err) {
      if (err.status === 409) {
        setErrorApi(err.message || 'Ya existe una cuenta con ese correo.')
      } else if (err.errores && err.errores.length) {
        setErrorApi(err.errores.join(' '))
      } else if (!err.status) {
        setErrorApi(
          'No se pudo conectar con la API. Verifica que el backend esté en ejecución (https://localhost:7043).'
        )
      } else {
        setErrorApi(err.message || 'No se pudo crear la cuenta.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <AppShell subtitulo="Crear cuenta">
      <form className="formulario" onSubmit={onSubmit} noValidate>
        <label>
          Nombre
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            autoComplete="name"
          />
          {errores.nombre && <span className="error">{errores.nombre}</span>}
        </label>

        <label>
          Correo electrónico
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={onChange}
            autoComplete="email"
          />
          {errores.correo && <span className="error">{errores.correo}</span>}
        </label>

        <label>
          Contraseña
          <input
            type="password"
            name="contrasena"
            value={form.contrasena}
            onChange={onChange}
            autoComplete="new-password"
          />
          {errores.contrasena && (
            <span className="error">{errores.contrasena}</span>
          )}
        </label>

        <label>
          Confirmar contraseña
          <input
            type="password"
            name="confirmar"
            value={form.confirmar}
            onChange={onChange}
            autoComplete="new-password"
          />
          {errores.confirmar && (
            <span className="error">{errores.confirmar}</span>
          )}
        </label>

        {errorApi && <p className="error">{errorApi}</p>}
        {exito && <p className="exito">{mensaje}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      {onIrALogin && (
        <p className="auth-enlace">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="link" onClick={onIrALogin}>
            Iniciar sesión
          </button>
        </p>
      )}
    </AppShell>
  )
}