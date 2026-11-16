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
export function recuperarContrasena(correo) {
  return request('/api/auth/recuperar-contrasena', { method: 'POST', body: JSON.stringify({ correo }), sinAutenticacion: true })
}

export function restablecerContrasena(token, nuevaContrasena) {
  return request('/api/auth/restablecer-contrasena', { method: 'POST', body: JSON.stringify({ token, nuevaContrasena }), sinAutenticacion: true })
}
