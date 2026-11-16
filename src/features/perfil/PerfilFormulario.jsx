import { useRecargaApi } from '../../api/useRecargaApi'
import { useEffect, useState } from 'react'
import Campo from '../../components/Campo'
import Alerta from '../../components/Alerta'
import Spinner from '../../components/Spinner'
import { useAviso } from '../../components/Aviso'
import { obtenerPerfil, editarPerfil, obtenerPreferencias, guardarPreferencias } from './perfilApi'
import { mensajeError } from '../../utils/mensajes'
import { fechaUtc } from '../../utils/fechas'

export default function PerfilFormulario({ onUsuarioActualizado, push }) {
  const revisionApi = useRecargaApi('/api/usuarios/me', false)
  const [perfil, setPerfil] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [intento, setIntento] = useState(0)
  const { avisar } = useAviso()
  useEffect(() => {
    let activo = true
    const cargar = async () => {
      setCargando(true)
      setError('')
      await Promise.all([obtenerPerfil(), obtenerPreferencias()]).then(([p, ajustes]) => {
        if (activo) { setPerfil(p); setPreferencias(ajustes) }
      }).catch((err) => { if (activo) setError(mensajeError(err, 'cargar el perfil')) })
        .finally(() => { if (activo) setCargando(false) })
    }
    void cargar()
    return () => { activo = false }
  }, [intento, revisionApi])
  const guardar = async (evento, esPerfil) => {
    evento.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError('')
    try {
      if (esPerfil) {
        const datos = await editarPerfil({ nombre: perfil.nombre.trim(), correo: perfil.correo.trim() })
        setPerfil(datos)
        onUsuarioActualizado?.(datos)
      } else {
        const datos = await guardarPreferencias(preferencias)
        setPreferencias(datos)
        localStorage.setItem('autiva_unidad', datos.unidadMedida)
        window.dispatchEvent(new Event('autiva:preferencias'))
        if (!datos.notificacionesPush && push?.activa) await push.desactivar()
      }
      avisar('Cambios guardados correctamente.')
    } catch (err) { setError(mensajeError(err, 'guardar los cambios')) }
    finally { setGuardando(false) }
  }
  return <div className="perfil-configuracion">
    {error && <Alerta tipo="error" accion={<button className="btn btn--secundario" onClick={() => setIntento((n) => n + 1)} disabled={cargando || guardando}>Reintentar consulta</button>}>{error}</Alerta>}
    {cargando ? <p role="status"><Spinner /> Consultando tu cuenta…</p> : perfil && preferencias && <>
      <section className="perfil-bloque"><h2>Editar datos de la cuenta</h2><form onSubmit={(e) => guardar(e, true)}>
        <Campo etiqueta="Nombre"><input required maxLength={120} value={perfil.nombre} onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })} /></Campo>
        <Campo etiqueta="Correo"><input type="email" required maxLength={150} value={perfil.correo} onChange={(e) => setPerfil({ ...perfil, correo: e.target.value })} /></Campo>
        <p className="perfil-metadatos">{perfil.numeroVehiculos} {perfil.numeroVehiculos === 1 ? 'vehículo' : 'vehículos'} · Cuenta creada el {fechaUtc(perfil.creadoEn).toLocaleDateString('es-MX')}</p>
        <button type="submit" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar perfil'}</button>
      </form></section>
      <section className="perfil-bloque"><h2>Preferencias de la cuenta</h2><form onSubmit={(e) => guardar(e, false)}>
        <Campo etiqueta="Unidad de rendimiento"><select value={preferencias.unidadMedida} onChange={(e) => setPreferencias({ ...preferencias, unidadMedida: e.target.value })}><option value="km_l">Kilómetros por litro</option><option value="mpg">Millas por galón</option></select></Campo>
        {[['notificacionesPush', 'Permitir avisos de la cuenta'], ['respaldoNube', 'Preferir respaldo en la nube'], ['modoOffline', 'Preferir captura sin conexión']].map(([clave, texto]) => <label className="perfil-opcion" key={clave}><input type="checkbox" checked={preferencias[clave]} onChange={(e) => setPreferencias({ ...preferencias, [clave]: e.target.checked })} />{texto}</label>)}
        <p className="texto-secundario">Estas preferencias se guardan en tu cuenta. Para recibir avisos, activa también este dispositivo.</p>
        <p className="perfil-metadatos">Última sincronización: {preferencias.ultimaSincronizacion ? fechaUtc(preferencias.ultimaSincronizacion).toLocaleString('es-MX') : 'Sin sincronizaciones registradas'}</p>
        <button type="submit" className="btn btn--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar preferencias'}</button>
      </form></section>
    </>}
  </div>
}
