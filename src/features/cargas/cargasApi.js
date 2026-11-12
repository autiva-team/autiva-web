import { request } from '../../api/cliente'

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
  return request(`/api/vehiculos/${vehiculoId}/cargas?${params.toString()}`)
}

export function obtenerCarga(id) {
  return request(`/api/cargas/${id}`)
}

export function obtenerRendimiento(vehiculoId) {
  return request(`/api/vehiculos/${vehiculoId}/cargas/rendimiento`)
}
