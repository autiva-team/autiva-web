import { request } from '../../api/cliente'

export function obtenerEstadisticas(id, periodo = '1M') {
  return request(`/api/vehiculos/${id}/estadisticas?periodo=${encodeURIComponent(periodo)}`)
}
