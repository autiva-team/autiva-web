/**
 * Recarga la página una sola vez cuando un service worker nuevo toma el control.
 *
 * - Solo actúa si la página ya estaba controlada por una versión anterior:
 *   en la primera visita no hay nada que actualizar y no se recarga.
 * - Pide al navegador buscar actualizaciones al volver a la app, para que
 *   quien la deja abierta (o instalada) también reciba la versión nueva.
 */
export function recargarAlActualizar({ ventana = window, navegador = navigator } = {}) {
  const sw = navegador?.serviceWorker
  if (!sw) return false

  const habiaVersionAnterior = Boolean(sw.controller)
  let recargando = false

  sw.addEventListener('controllerchange', () => {
    if (!habiaVersionAnterior || recargando) return
    recargando = true
    ventana.location.reload()
  })

  ventana.document?.addEventListener('visibilitychange', () => {
    if (ventana.document.visibilityState !== 'visible') return
    sw.getRegistration?.()
      .then((registro) => registro?.update())
      .catch(() => {})
  })

  return true
}
