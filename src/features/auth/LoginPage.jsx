import { useRef, useState } from 'react'
import { iniciarSesion } from './authApi'
import AppShell from '../../components/AppShell'
import AuthTabs from './AuthTabs'
import Alerta from '../../components/Alerta'
import Campo from '../../components/Campo'
import Spinner from '../../components/Spinner'
import Icon from '../../components/Icons'
import { validarEmail } from '../../utils/validaciones'
import { enfocarPrimerError } from '../../utils/mensajes'
import './LoginPage.css'

export default function LoginPage({ onLogin, onIrARegistro, onIrARecuperar }) {
  const [form, setForm] = useState({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [verContrasena, setVerContrasena] = useState(false)
  const formRef = useRef(null)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    // El error de un campo desaparece en cuanto el usuario lo corrige.
    if (errores[name]) setErrores((actuales) => ({ ...actuales, [name]: undefined }))
  }

  const validar = () => {
    const e = {}
    const correo = form.correo.trim()

    if (!correo) {
      e.correo = 'Escribe el correo con el que te registraste.'
    } else if (!validarEmail(correo)) {
      e.correo = 'Revisa el correo: debe tener el formato nombre@correo.com.'
    }

    if (!form.contrasena) {
      e.contrasena = 'Escribe tu contraseña.'
    }

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (cargando) return
    setErrorApi(null)
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }

    setCargando(true)
    try {
      const datos = await iniciarSesion({
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena,
      })
      onLogin(datos)
    } catch (err) {
      if (err.status === 401) {
        setErrorApi({
          titulo: 'Correo o contraseña incorrectos',
          texto: 'Revisa que el correo esté bien escrito y que Bloq Mayús esté desactivado.',
        })
      } else if (!err.status) {
        setErrorApi({
          titulo: 'No hay conexión con el servidor',
          texto: 'Revisa tu conexión a internet e inténtalo de nuevo.',
        })
      } else {
        setErrorApi({
          titulo: 'No se pudo iniciar sesión',
          texto: 'El servicio tuvo un problema temporal. Inténtalo de nuevo en unos minutos.',
        })
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <AppShell titulo="Iniciar sesión" descripcion="Entra para consultar y actualizar el expediente de tus vehículos.">
      <AuthTabs activo="login" onRegistro={onIrARegistro} />

      <form ref={formRef} className="formulario" onSubmit={onSubmit} noValidate aria-busy={cargando || undefined}>
        <Campo etiqueta="Correo electrónico" error={errores.correo}>
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={onChange}
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@correo.com"
            disabled={cargando}
          />
        </Campo>

        <Campo
          etiqueta="Contraseña"
          error={errores.contrasena}
          accesorio={
            <button
              type="button"
              onClick={() => setVerContrasena((visible) => !visible)}
              aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verContrasena}
            >
              <Icon name={verContrasena ? 'ojo-cerrado' : 'ojo'} size={20} />
            </button>
          }
        >
          <input
            type={verContrasena ? 'text' : 'password'}
            name="contrasena"
            value={form.contrasena}
            onChange={onChange}
            autoComplete="current-password"
            disabled={cargando}
          />
        </Campo>

        {onIrARecuperar && (
          <p className="auth-olvido">
            <button type="button" className="link" onClick={onIrARecuperar}>
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        )}

        {errorApi && (
          <Alerta
            tipo="error"
            titulo={errorApi.titulo}
          >
            {errorApi.texto}
          </Alerta>
        )}

        <button type="submit" className="btn btn--primario btn--lg btn--bloque" disabled={cargando} aria-busy={cargando || undefined}>
          {cargando && <Spinner size={18} />}
          {cargando ? 'Verificando tus datos…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="auth-enlace">
        ¿Aún no tienes cuenta?{' '}
        <button type="button" className="link" onClick={onIrARegistro}>
          Crea una gratis
        </button>
      </p>

      <p className="auth-nota">
        <Icon name="shield" size={16} />
        Tu información viaja cifrada y solo tú puedes verla.
      </p>
    </AppShell>
  )
}
