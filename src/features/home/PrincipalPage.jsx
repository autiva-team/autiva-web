import { useState } from 'react'
import { cerrarSesion } from '../auth/authApi'
import './PrincipalPage.css'

export default function PrincipalPage({ usuario, onLogout }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = async () => {
    setError('')
    setCargando(true)
    try {
      await cerrarSesion()
    } catch {
      // Aunque falle la API, se cierra la sesion local.
    } finally {
      setCargando(false)
      onLogout()
    }
  }

  return (
    <main className="contenedor principal">
      <h1>Autiva</h1>
      <p className="subtitulo">Expediente digital vehicular</p>

      <section className="tarjeta">
        <h2>Bienvenido</h2>
        {usuario && (
          <>
            <p>{usuario.nombre}</p>
            <p className="correo">{usuario.correo}</p>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={handleLogout} disabled={cargando}>
          {cargando ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  )
}