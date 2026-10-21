import { request } from '../../api/cliente'

// Registra una cuenta nueva: POST /api/auth/registrar
export function registrarUsuario({ nombre, correo, contrasena }) {
  return request('/api/auth/registrar', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, contrasena }),
  })
}

// Inicia sesion: POST /api/auth/login
export function iniciarSesion({ correo, contrasena }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  })
}

// Cierra sesion: POST /api/auth/logout (requiere token)
export function cerrarSesion() {
  return request('/api/auth/logout', {
    method: 'POST',
  })
}