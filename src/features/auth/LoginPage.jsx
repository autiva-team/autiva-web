import { useState } from 'react'
import { iniciarSesion } from './authApi'
import './LoginPage.css'

function validarEmail(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
}

export default function LoginPage({ onLogin, onIrARegistro }) {
  const [form, setForm] = useState({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [cargando, setCargando] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const validar = () => {
    const e = {}
    const correo = form.correo.trim()

    if (!correo) {
      e.correo = 'El correo es obligatorio.'
    } else if (!validarEmail(correo)) {
      e.correo = 'El correo no tiene un formato válido.'
    }

    if (!form.contrasena) {
      e.contrasena = 'La contraseña es obligatoria.'
    }

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    setErrorApi('')
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) return

    setCargando(true)
    try {
      const datos = await iniciarSesion({
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena,
      })
      onLogin(datos)
    } catch (err) {
      if (err.status === 401) {
        setErrorApi(err.message || 'Correo o contraseña incorrectos.')
      } else if (!err.status) {
        setErrorApi(
          'No se pudo conectar con la API. Verifica que el backend esté en ejecución (https://localhost:7043).'
        )
      } else {
        setErrorApi(err.message || 'No se pudo iniciar sesión.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="contenedor login">
      <h1>Autiva</h1>
      <p className="subtitulo">Iniciar sesión</p>
      <form className="tarjeta formulario" onSubmit={onSubmit} noValidate>
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
            autoComplete="current-password"
          />
          {errores.contrasena && (
            <span className="error">{errores.contrasena}</span>
          )}
        </label>

        {errorApi && <p className="error">{errorApi}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="enlace">
        ¿No tienes cuenta?{' '}
        <button type="button" className="link" onClick={onIrARegistro}>
          Crear cuenta
        </button>
      </p>
    </main>
  )
}