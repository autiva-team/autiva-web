import { request } from '../../api/cliente'
import { historialConPendientes, registroLocal } from '../../offline/registrosLocales'
import { vehiculoLocal, resolverVehiculoId } from '../../offline/vehiculosPendientes'

export function registrarServicio(vehiculoId, servicio) {
  return request(`/api/vehiculos/${vehiculoId}/servicios`, {
    method: 'POST',
    body: JSON.stringify(servicio),
  })
}

export function obtenerHistorialServicios(vehiculoId, pagina = 1, tamano = 10) {
  const params = new URLSearchParams()
  params.set('pagina', pagina)
  params.set('tamano', tamano)
  return historialConPendientes('servicio', vehiculoId, (id) => request(`/api/vehiculos/${id}/servicios?${params.toString()}`), pagina, tamano)
}

export async function obtenerServicio(id) {
  return await registroLocal('servicio', id) || request(`/api/servicios/${id}`)
}

export function editarServicio(id, datos) {
  return request(`/api/servicios/${id}`, { method: 'PUT', body: JSON.stringify(datos) })
}
export function eliminarServicio(id) {
  return request(`/api/servicios/${id}`, { method: 'DELETE' })
}
export async function obtenerProximoServicio(id) {
  const local = await vehiculoLocal(id)
  if (local) return { ultimoServicio: null, odometroActual: local.odometroActual }
  id = await resolverVehiculoId(id)
  return request(`/api/vehiculos/${id}/servicios/proximo`)
}
