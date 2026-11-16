import { request } from '../../api/cliente'

export const obtenerPerfil = () => request('/api/usuarios/me')
export const editarPerfil = (datos) => request('/api/usuarios/me', { method: 'PUT', body: JSON.stringify(datos) })
export const obtenerPreferencias = () => request('/api/usuarios/me/preferencias')
export const guardarPreferencias = ({ notificacionesPush, unidadMedida, respaldoNube, modoOffline }) =>
  request('/api/usuarios/me/preferencias', { method: 'PUT', body: JSON.stringify({ notificacionesPush, unidadMedida, respaldoNube, modoOffline }) })
