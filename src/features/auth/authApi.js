import { request } from '../../api/cliente'

// Registra una cuenta nueva: POST /api/auth/registrar
export function registrarUsuario({ nombre, correo, contrasena }) {
  return request('/api/auth/registrar', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, contrasena }),
  })
}