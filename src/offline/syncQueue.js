import { db } from './db'
import { request } from '../api/cliente'

// Guarda una carga en IndexedDB para enviarla despues.
export async function encolarCarga(carga) {
  const registro = { ...carga, id: carga.id || crypto.randomUUID(), creadoEn: new Date().toISOString() }
  await db.cargasPendientes.put(registro)
  return registro
}

// Guarda un servicio en IndexedDB para enviarlo despues.
export async function encolarServicio(servicio) {
  const registro = { ...servicio, id: servicio.id || crypto.randomUUID(), creadoEn: new Date().toISOString() }
  await db.serviciosPendientes.put(registro)
  return registro
}

// Envia en lote los pendientes al API y limpia la cola si tiene exito.
export async function sincronizarPendientes() {
  const cargas = await db.cargasPendientes.toArray()
  const servicios = await db.serviciosPendientes.toArray()

  if (cargas.length === 0 && servicios.length === 0) return { ok: true, sincronizados: 0 }

  try {
    await request('/api/sincronizacion', {
      method: 'POST',
      body: JSON.stringify({ cargas, servicios }),
    })
    await db.cargasPendientes.clear()
    await db.serviciosPendientes.clear()
    return { ok: true, sincronizados: cargas.length + servicios.length }
  } catch (error) {
    return { ok: false, error }
  }
}

// Ejecuta la sincronizacion en segundo plano sin bloquear a quien la llama.
// El .catch() evita que un error (por ejemplo, al leer IndexedDB) quede como
// una promesa rechazada sin manejar: se registra en consola y los pendientes
// siguen en la cola para el siguiente intento.
function sincronizarEnSegundoPlano() {
  sincronizarPendientes().catch((error) => {
    console.error('No se pudo sincronizar la cola offline:', error)
  })
}

// Registra los disparadores de sincronizacion (al abrir la app y al volver la conexion).
export function registrarSincronizacionAutomatica() {
  if (typeof window === 'undefined') return

  sincronizarEnSegundoPlano()

  window.addEventListener('online', sincronizarEnSegundoPlano)
}