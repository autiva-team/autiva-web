import { db } from './db'
import { cuentaActual } from './cuenta'
import { sincronizarVehiculos, pendientesVehiculos } from './vehiculosPendientes'
import { request } from '../api/cliente'

// Evento que avisa a la interfaz que cambio la cola (encolado o sincronizacion).
export const EVENTO_PENDIENTES = 'autiva:pendientes'

const paraServidor = (registro) => Object.fromEntries(Object.entries(registro).filter(([clave]) => !['cuentaId', 'creadoEn'].includes(clave)))

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
  const registro = { ...carga, fechaHora: carga.fechaHora || ahora, id: carga.id || crypto.randomUUID(), creadoEn: ahora, cuentaId: cuentaActual() }
  await db.cargasPendientes.put(registro)
  notificarCambio()
  return registro
}

// Guarda un servicio en IndexedDB para enviarlo despues.
export async function encolarServicio(servicio) {
  const registro = { ...servicio, id: servicio.id || crypto.randomUUID(), creadoEn: new Date().toISOString(), cuentaId: cuentaActual() }
  await db.serviciosPendientes.put(registro)
  notificarCambio()
  return registro
}

// Cuenta los registros que aun no se envian al API.
export async function contarPendientes() {
  const cuenta = cuentaActual()
  const [cargas, servicios, vehiculos] = await Promise.all([
    db.cargasPendientes.where('cuentaId').equals(cuenta).count(),
    db.serviciosPendientes.where('cuentaId').equals(cuenta).count(),
    db.vehiculosPendientes.where('cuentaId').equals(cuenta).count(),
  ])
  return cargas + servicios + vehiculos
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

  const cuenta = cuentaActual()
  const vehiculos = await sincronizarVehiculos()
  const bloqueados = new Set((await pendientesVehiculos()).map((v) => v.id))
  const cargas = (await db.cargasPendientes.toArray()).filter((r) => r.cuentaId === cuenta && !bloqueados.has(r.vehiculoId))
  const servicios = (await db.serviciosPendientes.toArray()).filter((r) => r.cuentaId === cuenta && !bloqueados.has(r.vehiculoId))
  const extras = vehiculos.vinculos.length || vehiculos.fallidos.length ? { vehiculosSincronizados: vehiculos.vinculos } : {}

  if (cargas.length === 0 && servicios.length === 0) {
    const resultado = { ok: true, sincronizados: vehiculos.vinculos.length, ...(Object.keys(extras).length ? { ...extras, fallidos: vehiculos.fallidos } : {}) }
    if (Object.keys(extras).length) notificarCambio(resultado)
    return resultado
  }

  try {
    // Respuesta: SincronizacionLoteResponse (insertados, duplicados ignorados e ids procesados).
    const respuesta = await request('/api/sincronizacion', {
      method: 'POST',
      body: JSON.stringify({ cargas: cargas.map(paraServidor), servicios: servicios.map(paraServidor) }),
    })
    if (cuentaActual() !== cuenta) return { ok: false, sinSesion: true }
    // Se borran por id: lo que se encole mientras viaja la peticion se conserva.
    // Los duplicados ignorados por la API (mismo GUID) ya existen en el servidor.
    const fallidos = respuesta?.fallidos || []
    const cargasConfirmadas = new Set(respuesta?.cargasSincronizadasIds || [])
    const serviciosConfirmados = new Set(respuesta?.serviciosSincronizadosIds || [])
    await db.cargasPendientes.bulkDelete(cargas.filter((c) => cargasConfirmadas.has(c.id) || fallidos.some((f) => f.tipo === 'carga' && f.id === c.id)).map((c) => c.id))
    await db.serviciosPendientes.bulkDelete(servicios.filter((s) => serviciosConfirmados.has(s.id) || fallidos.some((f) => f.tipo === 'servicio' && f.id === s.id)).map((s) => s.id))
    const insertados = cargas.filter((c) => cargasConfirmadas.has(c.id)).length + servicios.filter((s) => serviciosConfirmados.has(s.id)).length
    const resultado = { ok: true, sincronizados: insertados + vehiculos.vinculos.length, fallidos: [...vehiculos.fallidos, ...fallidos], ...extras }
    notificarCambio(resultado)
    return resultado
  } catch (error) {
    if (vehiculos.vinculos.length || vehiculos.fallidos.length) notificarCambio({ sincronizados: vehiculos.vinculos.length, fallidos: vehiculos.fallidos, ...extras })
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
  window.addEventListener('autiva:solicitar-sync', sincronizarEnSegundoPlano)
  window.addEventListener('focus', sincronizarEnSegundoPlano)
  // También reintenta cortes breves del API, sin requerir cerrar y abrir la app.
  const temporizador = setInterval(() => {
    if (document.visibilityState !== 'hidden' && navigator.onLine !== false) sincronizarEnSegundoPlano()
  }, 30_000)
  temporizador.unref?.()
}

export async function quitarPendientesVehiculo(vehiculoId) {
  await db.transaction('rw', db.cargasPendientes, db.serviciosPendientes, async () => {
    await db.cargasPendientes.where('vehiculoId').equals(vehiculoId).delete()
    await db.serviciosPendientes.where('vehiculoId').equals(vehiculoId).delete()
  })
  notificarCambio()
}

// Toda captura se persiste antes de intentar el envío en lote.
async function capturar(tipo, registro) {
  const datos = await (tipo === 'carga' ? encolarCarga(registro) : encolarServicio(registro))
  sincronizarEnSegundoPlano()
  return { datos, pendiente: true }
}

export const capturarCarga = (registro) => capturar('carga', registro)
export const capturarServicio = (registro) => capturar('servicio', registro)
