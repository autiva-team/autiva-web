import { db } from './db'
import { cuentaActual } from './cuenta'
import { request } from '../api/cliente'

const avisar = (detalle = {}) => window.dispatchEvent(new CustomEvent('autiva:pendientes', { detail: detalle }))
const placasDe = (v) => String(v.placas || '').trim().toUpperCase()
const mismo = (v, datos) => placasDe(v) === placasDe(datos) && v.marca?.trim().toLowerCase() === datos.marca?.trim().toLowerCase() && v.modelo?.trim().toLowerCase() === datos.modelo?.trim().toLowerCase() && Number(v.anio) === Number(datos.anio)
export const pendientesVehiculos = () => db.vehiculosPendientes.where('cuentaId').equals(cuentaActual()).toArray()
export async function vehiculoLocal(id) {
  const registro = await db.vehiculosPendientes.get(id)
  return registro?.cuentaId === cuentaActual() ? { ...registro.datos, id, odometroActual: registro.odometroActual ?? registro.datos.kilometrajeInicial, pendienteSincronizacion: true, errorSincronizacion: registro.error, esPrincipal: registro.esPrincipal, estatus: 'activo' } : null
}
export async function resolverVehiculoId(id) {
  const vinculo = await db.vehiculosVinculados.get(id)
  return vinculo?.cuentaId === cuentaActual() ? vinculo.servidorId : id
}
export async function combinarVehiculos(servidor = []) {
  const lista = Array.isArray(servidor) ? servidor : []
  const pendientes = await pendientesVehiculos()
  const locales = await Promise.all(pendientes.map((p) => vehiculoLocal(p.id)))
  return [...lista, ...locales.filter(Boolean)].map((v, i) => ({ ...v, esPrincipal: v.esPrincipal || (!lista.some((s) => s.esPrincipal) && i === 0) }))
}
export async function encolarVehiculo(datos) {
  const cuentaId = cuentaActual()
  const repetido = (await pendientesVehiculos()).find((v) => placasDe(v.datos) === placasDe(datos))
  if (repetido) throw Object.assign(new Error('Ya tienes un vehículo pendiente con esas placas.'), { status: 409 })
  let conocidos = []
  try { conocidos = JSON.parse(localStorage.getItem('autiva_vehiculos_cache') || '[]') } catch { /* Sin caché previa. */ }
  if (conocidos.some((v) => placasDe(v) === placasDe(datos))) throw Object.assign(new Error('Ya tienes un vehículo con esas placas.'), { status: 409 })
  const registro = { id: crypto.randomUUID(), cuentaId, datos, creadoEn: new Date().toISOString(), intentoIniciado: false }
  await db.vehiculosPendientes.put(registro)
  avisar()
  window.dispatchEvent(new Event('autiva:solicitar-sync'))
  return { datos: await vehiculoLocal(registro.id), pendiente: true }
}
export async function editarVehiculoLocal(id, cambios) {
  const registro = await db.vehiculosPendientes.get(id)
  if (!registro || registro.cuentaId !== cuentaActual()) return null
  await db.vehiculosPendientes.update(id, { datos: { ...registro.datos, ...cambios }, odometroActual: cambios.odometroActual ?? registro.odometroActual, error: null })
  avisar()
  window.dispatchEvent(new Event('autiva:solicitar-sync'))
  return vehiculoLocal(id)
}
export async function eliminarVehiculoLocal(id) {
  if (!await vehiculoLocal(id)) return false
  await db.transaction('rw', db.vehiculosPendientes, db.cargasPendientes, db.serviciosPendientes, async () => {
    await db.vehiculosPendientes.delete(id)
    await db.cargasPendientes.where('vehiculoId').equals(id).delete()
    await db.serviciosPendientes.where('vehiculoId').equals(id).delete()
  })
  avisar()
  return true
}

// El API asigna el GUID del vehículo: primero se registra, luego se remapean sus hijos.
export async function sincronizarVehiculos() {
  const pendientes = (await pendientesVehiculos()).filter((v) => !v.error)
  const vinculos = []
  const fallidos = []
  for (const registro of pendientes) {
    if (cuentaActual() !== registro.cuentaId || !localStorage.getItem('autiva_token')) break
    let recibido
    try {
      if (registro.intentoIniciado) {
        const lista = await request('/api/vehiculos', { sinCache: true })
        const existente = Array.isArray(lista) && lista.find((v) => placasDe(v) === placasDe(registro.datos))
        if (existente && !mismo(existente, registro.datos)) throw Object.assign(new Error('Ya existe otro vehículo con esas placas. Revisa el vehículo pendiente.'), { status: 409 })
        if (existente) recibido = existente
      }
      if (!recibido) {
        await db.vehiculosPendientes.update(registro.id, { intentoIniciado: true })
        recibido = await request('/api/vehiculos', { method: 'POST', body: JSON.stringify(registro.datos) })
      }
      if (!recibido?.id) throw new Error('El servidor no confirmó el vehículo.')
      if (cuentaActual() !== registro.cuentaId) break
      if (registro.odometroActual > Number(recibido.odometroActual ?? recibido.kilometrajeInicial)) {
        recibido = await request(`/api/vehiculos/${recibido.id}/odometro`, { method: 'PATCH', body: JSON.stringify({ odometroActual: registro.odometroActual }) })
      }
      await db.transaction('rw', db.vehiculosPendientes, db.vehiculosVinculados, db.cargasPendientes, db.serviciosPendientes, async () => {
        await db.vehiculosVinculados.put({ id: registro.id, servidorId: recibido.id, cuentaId: registro.cuentaId })
        for (const tabla of [db.cargasPendientes, db.serviciosPendientes]) {
          await tabla.where('vehiculoId').equals(registro.id).filter((r) => r.cuentaId === registro.cuentaId).modify({ vehiculoId: recibido.id })
        }
        await db.vehiculosPendientes.delete(registro.id)
      })
      vinculos.push({ localId: registro.id, vehiculo: recibido })
    } catch (error) {
      if ([400, 404, 409, 422].includes(error.status)) {
        const motivo = error.errores?.join(' ') || error.message
        await db.vehiculosPendientes.update(registro.id, { error: motivo })
        fallidos.push({ id: registro.id, tipo: 'vehiculo', motivo })
      } else break // Red, sesión o servidor: conservar para el próximo intento.
    }
  }
  return { vinculos, fallidos }
}
