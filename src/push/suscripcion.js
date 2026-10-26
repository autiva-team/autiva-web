import { request } from '../api/cliente'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// Obtiene la clave VAPID publica del backend.
export async function obtenerClavePublicaVapid() {
  const datos = await request('/api/push/clave-publica')
  return datos?.clavePublica || datos?.publicKey || datos?.public_key
}

// Suscribe al usuario a notificaciones push y envia la suscripcion al backend.
// Debe llamarse solo despues de un clic del usuario.
export async function suscribirPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Las notificaciones push no son compatibles con este navegador.')
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error('Permiso de notificaciones denegado.')
  }

  const registro = await navigator.serviceWorker.ready
  const clave = await obtenerClavePublicaVapid()
  if (!clave) throw new Error('No se pudo obtener la clave VAPID.')

  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(clave),
  })

  await request('/api/push/suscripciones', {
    method: 'POST',
    body: JSON.stringify(suscripcion),
  })

  return suscripcion
}