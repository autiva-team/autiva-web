import { request } from '../../api/cliente'
import { combinarVehiculos, vehiculoLocal, resolverVehiculoId, editarVehiculoLocal, eliminarVehiculoLocal } from '../../offline/vehiculosPendientes'

export function registrarVehiculo({
  marca,
  modelo,
  anio,
  placas,
  kilometrajeInicial,
  color,
  fotoUrl,
}) {
  return request('/api/vehiculos', {
    method: 'POST',
    body: JSON.stringify({
      marca,
      modelo,
      anio,
      placas,
      kilometrajeInicial,
      color: color || null,
      fotoUrl: fotoUrl || null,
    }),
  })
}

export async function listarVehiculos() {
  try { return combinarVehiculos(await request('/api/vehiculos')) } catch (error) {
    if (error.status) throw error
    let cache = []
    try { cache = JSON.parse(localStorage.getItem('autiva_vehiculos_cache') || '[]').filter((v) => !v.pendienteSincronizacion) } catch { /* Sin caché. */ }
    return combinarVehiculos(cache)
  }
}

export async function obtenerVehiculo(id) {
  return await vehiculoLocal(id) || request(`/api/vehiculos/${await resolverVehiculoId(id)}`)
}

export function marcarVehiculoActivo(id) {
  return request(`/api/vehiculos/${id}/activo`, { method: 'PATCH' })
}

export async function actualizarOdometro(id, odometroActual) {
  if (await vehiculoLocal(id)) return editarVehiculoLocal(id, { odometroActual })
  return request(`/api/vehiculos/${id}/odometro`, {
    method: 'PATCH',
    body: JSON.stringify({ odometroActual }),
  })
}

export async function obtenerResumenVehiculo(id) {
  if (await vehiculoLocal(id)) return { totalCargas: 0, totalServicios: 0, totalRecordatoriosPendientes: 0 }
  id = await resolverVehiculoId(id)
  return request(`/api/vehiculos/${id}/resumen`)
}

export async function editarVehiculo(id, datos) {
  if (await vehiculoLocal(id)) return editarVehiculoLocal(id, datos)
  id = await resolverVehiculoId(id)
  return request(`/api/vehiculos/${id}`, { method: 'PUT', body: JSON.stringify(datos) })
}
export async function eliminarVehiculo(id) {
  if (await eliminarVehiculoLocal(id)) return null
  id = await resolverVehiculoId(id)
  return request(`/api/vehiculos/${id}`, { method: 'DELETE' })
}
