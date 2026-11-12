import { request } from '../../api/cliente'

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
  return request(`/api/vehiculos/${vehiculoId}/servicios?${params.toString()}`)
}

export function obtenerServicio(id) {
  return request(`/api/servicios/${id}`)
}
