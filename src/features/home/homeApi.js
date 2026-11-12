import { request } from '../../api/cliente'

export function obtenerHome() {
  return request('/api/home')
}
