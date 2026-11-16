import { request } from '../../api/cliente'

export const CATEGORIAS_GASTO = ['Lavado', 'Peajes y estacionamiento', 'Tenencia y trámites', 'Multas', 'Accesorios', 'Otro']

export function obtenerGastos(id, filtros = {}) {
  const params = new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null))
  return request(`/api/vehiculos/${id}/gastos?${params}`)
}

export function obtenerResumenGastos(id, anio, mes) {
  const params = anio && mes ? `?anio=${anio}&mes=${mes}` : ''
  return request(`/api/vehiculos/${id}/gastos/resumen${params}`)
}

export function registrarGasto(id, datos) {
  return request(`/api/vehiculos/${id}/gastos`, { method: 'POST', body: JSON.stringify(datos) })
}
