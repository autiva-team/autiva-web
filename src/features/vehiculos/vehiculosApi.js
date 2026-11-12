import { request } from '../../api/cliente'

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

export function listarVehiculos() {
  return request('/api/vehiculos')
}

export function obtenerVehiculo(id) {
  return request(`/api/vehiculos/${id}`)
}

export function marcarVehiculoActivo(id) {
  return request(`/api/vehiculos/${id}/activo`, { method: 'PATCH' })
}

export function actualizarOdometro(id, odometroActual) {
  return request(`/api/vehiculos/${id}/odometro`, {
    method: 'PATCH',
    body: JSON.stringify({ odometroActual }),
  })
}

export function obtenerResumenVehiculo(id) {
  return request(`/api/vehiculos/${id}/resumen`)
}
