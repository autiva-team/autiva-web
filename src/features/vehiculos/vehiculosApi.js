import { request } from '../../api/cliente'

// Registra un vehiculo del usuario autenticado: POST /api/vehiculos
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