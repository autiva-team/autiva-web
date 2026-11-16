import { request } from '../../api/cliente'
import { historialConPendientes, registroLocal } from '../../offline/registrosLocales'
import { vehiculoLocal, resolverVehiculoId } from '../../offline/vehiculosPendientes'

export function registrarCarga(vehiculoId, carga) {
  return request(`/api/vehiculos/${vehiculoId}/cargas`, {
    method: 'POST',
    body: JSON.stringify(carga),
  })
}

export function obtenerHistorialCargas(vehiculoId, pagina = 1, tamano = 10, desde, hasta) {
  const params = new URLSearchParams()
  params.set('pagina', pagina)
  params.set('tamano', tamano)
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  return historialConPendientes('carga', vehiculoId, (id) => request(`/api/vehiculos/${id}/cargas?${params.toString()}`), pagina, tamano, desde, hasta)
}

export async function obtenerCarga(id) {
  return await registroLocal('carga', id) || request(`/api/cargas/${id}`)
}

export async function obtenerRendimiento(vehiculoId) {
  if (await vehiculoLocal(vehiculoId)) return { totalCargas: 0, rendimientoPromedioKml: null, gastoMesActual: 0 }
  vehiculoId = await resolverVehiculoId(vehiculoId)
  return request(`/api/vehiculos/${vehiculoId}/cargas/rendimiento`)
}

export function editarCarga(id, datos) {
  return request(`/api/cargas/${id}`, { method: 'PUT', body: JSON.stringify(datos) })
}
export function eliminarCarga(id) {
  return request(`/api/cargas/${id}`, { method: 'DELETE' })
}
