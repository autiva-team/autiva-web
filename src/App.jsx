import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [respuesta, setRespuesta] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/Home`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then((data) => setRespuesta(data))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="contenedor">
      <h1>Autiva</h1>
      <p className="subtitulo">Expediente digital vehicular</p>
      <p className="version">Versión 1.1</p>

      <section className="tarjeta">
        <h2>Estado de la API</h2>
        {respuesta && (
          <>
            <p>✅{respuesta.mensaje}</p>
            <p>Conexión configurada: {respuesta.conexionConfigurada ? 'Sí' : 'No'}</p>
          </>
        )}
        {error && <p className="error">❌ No se pudo conectar con la API ({error})</p>}
        {!respuesta && !error && <p>Cargando...</p>}
      </section>
    </main>
  )
}

export default App