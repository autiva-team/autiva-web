// Identidad estable entre renovaciones del JWT; nunca se persiste el token en las colas.
export function cuentaActual() {
  try {
    const usuario = JSON.parse(localStorage.getItem('autiva_usuario') || 'null')
    if (usuario?.id || usuario?.usuarioId) return String(usuario.id || usuario.usuarioId)
  } catch { /* Perfil aún no disponible. */ }
  const token = localStorage.getItem('autiva_token') || ''
  let hash = 2166136261
  for (const caracter of token) hash = Math.imul(hash ^ caracter.charCodeAt(0), 16777619)
  return token ? `sesion-${hash >>> 0}` : 'sin-sesion'
}
