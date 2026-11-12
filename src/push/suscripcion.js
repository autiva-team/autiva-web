import { request } from '../api/cliente'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function nombreDispositivo() {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Navegador'
}

// Error con mensaje ya redactado para la persona usuaria.
function errorAmigable(texto) {
  const error = new Error(texto)
  error.amigable = true
  return error
}

export function pushCompatible() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Obtiene la clave VAPID pública del backend.
// GET /api/push/clave-publica → { clavePublica }
export async function obtenerClavePublicaVapid() {
  const datos = await request('/api/push/clave-publica')
  return datos?.clavePublica || datos?.publicKey
}

// Devuelve la suscripción activa de este navegador, si existe.
export async function obtenerSuscripcionActual() {
  if (!pushCompatible()) return null
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) return null
  return registro.pushManager.getSubscription()
}

// Suscribe al usuario a notificaciones push y envía la suscripción al backend.
// Debe llamarse solo después de un clic del usuario.
// POST /api/push/suscribir → { endpoint, claveP256dh, claveAuth, dispositivo }
export async function suscribirPush() {
  if (!pushCompatible()) {
    throw errorAmigable('Este navegador no admite notificaciones. Prueba con Chrome, Edge o Safari actualizado.')
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw errorAmigable('Bloqueaste las notificaciones. Actívalas en la configuración del sitio de tu navegador e inténtalo de nuevo.')
  }

  const registro = await navigator.serviceWorker.ready
  const clave = await obtenerClavePublicaVapid()
  if (!clave) throw errorAmigable('El servidor aún no tiene configuradas las notificaciones. Inténtalo más tarde.')

  const suscripcion =
    (await registro.pushManager.getSubscription()) ||
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(clave),
    }))

  const { endpoint, keys } = suscripcion.toJSON()
  await request('/api/push/suscribir', {
    method: 'POST',
    body: JSON.stringify({
      endpoint,
      claveP256dh: keys?.p256dh,
      claveAuth: keys?.auth,
      dispositivo: nombreDispositivo(),
    }),
  })

  return suscripcion
}

// Desactiva la suscripción en el backend y en el navegador.
// POST /api/push/desuscribir → { endpoint }
export async function desuscribirPush() {
  const suscripcion = await obtenerSuscripcionActual()
  if (!suscripcion) return
  await request('/api/push/desuscribir', {
    method: 'POST',
    body: JSON.stringify({ endpoint: suscripcion.endpoint }),
  })
  await suscripcion.unsubscribe()
}

// Bandeja de notificaciones (últimas 50).
// GET /api/push/notificaciones
export function obtenerNotificaciones() {
  return request('/api/push/notificaciones')
}

// PATCH /api/push/notificaciones/{id}/leida
export function marcarNotificacionLeida(id) {
  return request(`/api/push/notificaciones/${id}/leida`, { method: 'PATCH' })
}
