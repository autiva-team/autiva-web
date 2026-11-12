import { useRef, useState } from 'react'
import { registrarUsuario } from './authApi'
import AppShell from '../../components/AppShell'
import AuthTabs from './AuthTabs'
import Alerta from '../../components/Alerta'
import Campo from '../../components/Campo'
import Spinner from '../../components/Spinner'
import Icon from '../../components/Icons'
import { validarEmail } from '../../utils/validaciones'
import { enfocarPrimerError, mensajeError } from '../../utils/mensajes'
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
  const [cuentaCreada, setCuentaCreada] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [verContrasena, setVerContrasena] = useState(false)
  const formRef = useRef(null)
  const exitoRef = useRef(null)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errores[name]) setErrores((actuales) => ({ ...actuales, [name]: undefined }))
  }

  const validar = () => {
    const e = {}
    const nombre = form.nombre.trim()
    const correo = form.correo.trim()

    if (!nombre) e.nombre = 'Escribe tu nombre; así te saludaremos en la app.'
    else if (nombre.length > 100) e.nombre = 'Usa máximo 100 caracteres en el nombre.'

    if (!correo) e.correo = 'Escribe tu correo; lo usarás para iniciar sesión.'
    else if (!validarEmail(correo)) e.correo = 'Revisa el correo: debe tener el formato nombre@correo.com.'
    else if (correo.length > 150) e.correo = 'Usa un correo de máximo 150 caracteres.'

    if (!form.contrasena) e.contrasena = 'Crea una contraseña de al menos 8 caracteres.'
    else if (form.contrasena.length < 8) e.contrasena = `Te faltan ${8 - form.contrasena.length} caracteres: la contraseña necesita al menos 8.`
    else if (form.contrasena.length > 72) e.contrasena = 'Usa máximo 72 caracteres en la contraseña.'

    if (!form.confirmar) e.confirmar = 'Escribe de nuevo la contraseña para confirmarla.'
    else if (form.confirmar !== form.contrasena) e.confirmar = 'Las contraseñas no coinciden; escríbela igual en ambos campos.'

    return e
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (cargando) return
    setErrorApi('')

    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) {
      enfocarPrimerError(formRef.current)
      return
    }

    setCargando(true)
    try {
      await registrarUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        contrasena: form.contrasena,
      })
      setCuentaCreada(true)
      setForm({ nombre: '', correo: '', contrasena: '', confirmar: '' })
      setErrores({})
      requestAnimationFrame(() => exitoRef.current?.focus())
    } catch (err) {
      if (err.status === 409) {
        setErrorApi('Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.')
      } else {
        setErrorApi(mensajeError(err, 'crear la cuenta'))
      }
    } finally {
      setCargando(false)
    }
  }

  if (cuentaCreada) {
    return (
      <AppShell titulo="¡Tu cuenta está lista!" descripcion="Ya puedes iniciar sesión con tu correo y contraseña.">
        <div className="registro-exito" ref={exitoRef} tabIndex={-1} role="status">
          <span className="registro-exito-icono" aria-hidden="true">
            <Icon name="check-circulo" size={32} />
          </span>
          <p>
            El siguiente paso es registrar tu vehículo. Toma menos de un minuto y después podrás anotar tu primera carga.
          </p>
        </div>
        <button type="button" className="btn btn--primario btn--lg btn--bloque" onClick={onIrALogin}>
          Iniciar sesión
        </button>
      </AppShell>
    )
  }

  return (
    <AppShell titulo="Crear cuenta" descripcion="Solo necesitas tu nombre, un correo y una contraseña.">
      <AuthTabs activo="registro" onLogin={onIrALogin} />
      <form ref={formRef} className="formulario" onSubmit={onSubmit} noValidate aria-busy={cargando || undefined}>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            autoComplete="name"
            placeholder="Nombre y apellido"
            maxLength={100}
            disabled={cargando}
          />
        </Campo>

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
          ayuda="Mínimo 8 caracteres. Combinar letras y números la hace más segura."
          error={errores.contrasena}
          accesorio={
            <button
              type="button"
              onClick={() => setVerContrasena((visible) => !visible)}
              aria-label={verContrasena ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
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
            autoComplete="new-password"
            disabled={cargando}
          />
        </Campo>

        <Campo etiqueta="Confirma la contraseña" error={errores.confirmar}>
          <input
            type={verContrasena ? 'text' : 'password'}
            name="confirmar"
            value={form.confirmar}
            onChange={onChange}
            autoComplete="new-password"
            disabled={cargando}
          />
        </Campo>

        {errorApi && <Alerta tipo="error" titulo="No se pudo crear la cuenta">{errorApi}</Alerta>}

        <button type="submit" className="btn btn--primario btn--lg btn--bloque" disabled={cargando} aria-busy={cargando || undefined}>
          {cargando && <Spinner size={18} />}
          {cargando ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      {onIrALogin && (
        <p className="auth-enlace">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="link" onClick={onIrALogin}>
            Inicia sesión
          </button>
        </p>
      )}
    </AppShell>
  )
}
