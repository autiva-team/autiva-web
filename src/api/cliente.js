const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const enCurso = new Map()
const memoria = new Map()
const PREFIJO = 'autiva_api_cache:'
const VIGENCIA = 15_000
const MAXIMO = 100
let generacion = 0
export const EVENTO_DATOS = 'autiva:datos'

function identidad(token) {
  try {
    const usuario = JSON.parse(localStorage.getItem('autiva_usuario') || 'null')
    if (usuario?.id) return String(usuario.id)
  } catch { /* Se usa una huella de la sesión. */ }
  let hash = 2166136261
  for (const c of token || '') hash = Math.imul(hash ^ c.charCodeAt(0), 16777619)
  return String(hash >>> 0)
}
function leer(clave) {
  if (memoria.has(clave)) return memoria.get(clave)
  try { const dato = JSON.parse(localStorage.getItem(clave) || 'null'); if (dato) memoria.set(clave, dato); return dato } catch { return null }
}
function guardar(clave, valor) {
  memoria.set(clave, valor)
  if (memoria.size > MAXIMO) memoria.delete(memoria.keys().next().value)
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    const claves = Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO))
    for (const antigua of claves.slice(0, Math.max(0, claves.length - MAXIMO))) localStorage.removeItem(antigua)
  } catch { /* La caché en memoria sigue disponible si se llena el almacenamiento. */ }
}
function notificar(ruta) {
  window.dispatchEvent(new CustomEvent(EVENTO_DATOS, { detail: { ruta } }))
}
export function invalidarDatos() {
  generacion += 1
  const claves = new Set([...memoria.keys(), ...Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO))])
  for (const clave of claves) { const dato = leer(clave); if (dato) guardar(clave, { ...dato, actualizado: 0 }) }
}
export function limpiarCacheApi() {
  generacion += 1
  memoria.clear()
  navigator.serviceWorker?.controller?.postMessage({ tipo: 'AUTIVA_LIMPIAR_CACHE_API' })
  enCurso.clear()
  for (const clave of Object.keys(localStorage)) if (clave.startsWith(PREFIJO)) localStorage.removeItem(clave)
}

// Caché inmediata + revalidación; las mutaciones y la sincronización siempre van a red.
export async function request(ruta, opciones = {}) {
  const { sinAutenticacion = false, sinCache = false, timeoutMs = 12_000, ...opcionesFetch } = opciones
  const token = localStorage.getItem('autiva_token')
  const metodo = (opciones.method || 'GET').toUpperCase()
  const cacheable = metodo === 'GET' && Boolean(token) && !sinAutenticacion && !sinCache && !opciones.signal
  const clave = `${PREFIJO}${identidad(token)}:${API_URL}:${ruta}`
  const anterior = cacheable ? leer(clave) : null
  const ejecutar = async () => {
    const generacionInicial = generacion
    const controller = new AbortController()
    const temporizador = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) }
      if (token && !sinAutenticacion) headers.Authorization = `Bearer ${token}`
      const respuesta = await fetch(`${API_URL}${ruta}`, { ...opcionesFetch, headers, signal: opciones.signal || controller.signal })
      if (!respuesta.ok) {
        let datos = null
        try { datos = await respuesta.json() } catch { /* Respuesta sin JSON. */ }
        if (respuesta.status === 401 && !ruta.startsWith('/api/auth/') && token === localStorage.getItem('autiva_token')) {
          limpiarCacheApi()
          localStorage.removeItem('autiva_token')
          localStorage.removeItem('autiva_usuario')
          window.dispatchEvent(new Event('autiva:unauthorized'))
        }
        throw Object.assign(new Error(datos?.mensaje || `Error ${respuesta.status}`), { status: respuesta.status, errores: datos?.errores })
      }
      if (metodo !== 'GET') { invalidarDatos(); notificar(ruta) }
      if (respuesta.status === 204) return null
      const json = (respuesta.headers.get('content-type') || '').includes('application/json')
      const datos = await (json ? respuesta.json() : respuesta.text())
      if (cacheable && json && generacion === generacionInicial && token === localStorage.getItem('autiva_token')) {
        guardar(clave, { datos, actualizado: Date.now() })
        if (anterior && JSON.stringify(anterior.datos) !== JSON.stringify(datos)) notificar(ruta)
      }
      return datos
    } finally { clearTimeout(temporizador) }
  }
  const obtener = () => {
    if (!cacheable) return ejecutar()
    if (!enCurso.has(clave)) {
      const pendiente = ejecutar().finally(() => { if (enCurso.get(clave) === pendiente) enCurso.delete(clave) })
      enCurso.set(clave, pendiente)
    }
    return enCurso.get(clave)
  }
  if (anterior) {
    if (navigator.onLine !== false && Date.now() - anterior.actualizado > VIGENCIA) void obtener().catch(() => {})
    return anterior.datos
  }
  if (navigator.onLine === false) throw new TypeError('Sin conexión a internet')
  return obtener()
}
export { API_URL }
