import { db } from './db'
import { request } from '../api/cliente'

// Evento que avisa a la interfaz que cambio la cola (encolado o sincronizacion).
export const EVENTO_PENDIENTES = 'autiva:pendientes'

function notificarCambio(detalle = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTO_PENDIENTES, { detail: detalle }))
}

// Indica si un error de request() fue por falta de red (no hubo respuesta HTTP).
export function esErrorDeRed(error) {
  return !error?.status
}

// Guarda una carga en IndexedDB para enviarla despues.
export async function encolarCarga(carga) {
  const ahora = new Date().toISOString()
  // fechaHora es obligatoria en CargaSincronizacionDto: si no se capturó, se usa el momento del registro.
  const registro = { ...carga, fechaHora: carga.fechaHora || ahora, id: carga.id || crypto.randomUUID(), creadoEn: ahora }
  await db.cargasPendientes.put(registro)
  notificarCambio()
  return registro
}

// Guarda un servicio en IndexedDB para enviarlo despues.
export async function encolarServicio(servicio) {
  const registro = { ...servicio, id: servicio.id || crypto.randomUUID(), creadoEn: new Date().toISOString() }
  await db.serviciosPendientes.put(registro)
  notificarCambio()
  return registro
}

// Cuenta los registros que aun no se envian al API.
export async function contarPendientes() {
  const [cargas, servicios] = await Promise.all([
    db.cargasPendientes.count(),
    db.serviciosPendientes.count(),
  ])
  return cargas + servicios
}

let sincronizando = null

// Envia en lote los pendientes al API y quita de la cola solo lo que se envio.
// Si ya hay una sincronizacion en curso, devuelve esa misma promesa.
export function sincronizarPendientes() {
  if (!sincronizando) {
    sincronizando = enviarPendientes().finally(() => {
      sincronizando = null
    })
  }
  return sincronizando
}

async function enviarPendientes() {
  if (!localStorage.getItem('autiva_token')) return { ok: false, sinSesion: true }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, sinConexion: true }

  const cargas = await db.cargasPendientes.toArray()
  const servicios = await db.serviciosPendientes.toArray()

  if (cargas.length === 0 && servicios.length === 0) return { ok: true, sincronizados: 0 }

  try {
    // Respuesta: SincronizacionLoteResponse (insertados, duplicados ignorados e ids procesados).
    const respuesta = await request('/api/sincronizacion', {
      method: 'POST',
      body: JSON.stringify({ cargas, servicios }),
    })
    // Se borran por id: lo que se encole mientras viaja la peticion se conserva.
    // Los duplicados ignorados por la API (mismo GUID) ya existen en el servidor.
    await db.cargasPendientes.bulkDelete(cargas.map((c) => c.id))
    await db.serviciosPendientes.bulkDelete(servicios.map((s) => s.id))
    const insertados = (respuesta?.cargasInsertadas ?? cargas.length) + (respuesta?.serviciosInsertados ?? servicios.length)
    const resultado = { ok: true, sincronizados: insertados }
    notificarCambio(resultado)
    return resultado
  } catch (error) {
    return { ok: false, error }
  }
}

// Ejecuta la sincronizacion en segundo plano sin bloquear a quien la llama.
// El .catch() evita que un error (por ejemplo, al leer IndexedDB) quede como
// una promesa rechazada sin manejar: se registra en consola y los pendientes
// siguen en la cola para el siguiente intento.
export function sincronizarEnSegundoPlano() {
  sincronizarPendientes().catch((error) => {
    console.error('No se pudo sincronizar la cola offline:', error)
  })
}

let registrado = false

// Registra los disparadores de sincronizacion (al abrir la app y al volver la conexion).
// No usa Background Sync API porque Safari no la soporta.
export function registrarSincronizacionAutomatica() {
  if (typeof window === 'undefined' || registrado) return
  registrado = true

  sincronizarEnSegundoPlano()
  window.addEventListener('online', sincronizarEnSegundoPlano)
}
