// Cliente HTTP para la API de Autiva.
// La base URL se toma de la variable de entorno VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function request(ruta, opciones = {}) {
  const token = localStorage.getItem('autiva_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers,
  })

  if (!respuesta.ok) {
    let datos = null
    try {
      datos = await respuesta.json()
    } catch {
      // respuesta sin cuerpo JSON
    }
    const error = new Error(datos?.mensaje || `Error ${respuesta.status}`)
    error.status = respuesta.status
    error.errores = datos?.errores
    throw error
  }

  if (respuesta.status === 204) {
    return null
  }

  const tipo = respuesta.headers.get('content-type') || ''
  if (tipo.includes('application/json')) {
    return respuesta.json()
  }
  return respuesta.text()
}

export { API_URL }