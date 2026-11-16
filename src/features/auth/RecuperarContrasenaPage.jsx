import { useState } from 'react'
import AppShell from '../../components/AppShell'
import Campo from '../../components/Campo'
import Alerta from '../../components/Alerta'
import { recuperarContrasena, restablecerContrasena } from './authApi'
import { mensajeError } from '../../utils/mensajes'
import './RecuperarContrasenaPage.css'

export default function RecuperarContrasenaPage({ onVolver, restablecer = false, onPedirOtro }) {
  const token = new URLSearchParams(window.location.search).get('token')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [terminado, setTerminado] = useState(false)
  const enviar = async (evento) => {
    evento.preventDefault()
    const datos = Object.fromEntries(new FormData(evento.currentTarget))
    setError('')
    if (restablecer && datos.nuevaContrasena !== datos.confirmar) { setError('Las contraseñas no coinciden.'); return }
    setCargando(true)
    try {
      const respuesta = restablecer ? await restablecerContrasena(token, datos.nuevaContrasena) : await recuperarContrasena(datos.correo)
      setMensaje(respuesta?.mensaje || (restablecer ? 'Tu contraseña se actualizó.' : 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.'))
      setTerminado(true)
    } catch (err) { setError(mensajeError(err, restablecer ? 'restablecer la contraseña' : 'solicitar el enlace')) }
    finally { setCargando(false) }
  }
  const invalido = restablecer && !token
  return <AppShell titulo={restablecer ? 'Restablecer contraseña' : 'Recuperar contraseña'} descripcion={restablecer ? 'Crea una contraseña nueva para tu cuenta.' : 'Solicita un enlace para recuperar el acceso.'}>
    {invalido && <Alerta tipo="error">El enlace no es válido.</Alerta>}
    {error && <Alerta tipo="error">{error}</Alerta>}
    {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
    {!invalido && !terminado && <form className="recuperar-formulario" onSubmit={enviar}>
      {restablecer ? <>
        <Campo etiqueta="Nueva contraseña" ayuda="Entre 8 y 72 caracteres"><input name="nuevaContrasena" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Campo>
        <Campo etiqueta="Confirmar contraseña"><input name="confirmar" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Campo>
      </> : <Campo etiqueta="Correo electrónico"><input name="correo" type="email" autoComplete="email" maxLength={150} required /></Campo>}
      <button type="submit" className="btn btn--primario btn--lg btn--bloque" disabled={cargando}>{cargando ? 'Enviando…' : restablecer ? 'Guardar contraseña' : 'Enviar enlace'}</button>
    </form>}
    {restablecer && (invalido || error) && <button className="btn btn--secundario btn--bloque" onClick={onPedirOtro}>Pedir otro enlace</button>}
    <button className="btn btn--secundario btn--bloque" onClick={onVolver}>Volver a iniciar sesión</button>
  </AppShell>
}
