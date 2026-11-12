// Mensajes de error comprensibles: qué ocurrió y cómo corregirlo.
// Todas las pantallas usan la misma redacción para que el usuario
// aprenda una sola forma de leer los problemas.

/**
 * Convierte un error de la API en un mensaje útil.
 * @param {Error & {status?: number, errores?: string[]}} error
 * @param {string} accion Verbo en infinitivo con su objeto, p. ej. «guardar la carga».
 */
export function mensajeError(error, accion = 'completar la operación') {
  const base = `No se pudo ${accion}.`

  if (!error?.status) {
    return `${base} Revisa tu conexión a internet e inténtalo de nuevo.`
  }

  if (Array.isArray(error.errores) && error.errores.length > 0) {
    return `${base} ${error.errores.join(' ')}`
  }

  switch (error.status) {
    case 400:
    case 422:
      return `${base} ${error.message && !/^Error \d+$/.test(error.message) ? error.message : 'Revisa los datos marcados e inténtalo de nuevo.'}`
    case 401:
      return `${base} Tu sesión terminó. Inicia sesión otra vez para continuar.`
    case 403:
      return `${base} Tu cuenta no tiene permiso para esta acción.`
    case 404:
      return `${base} El registro ya no existe; actualiza la página para ver la información más reciente.`
    case 409:
      return `${base} ${error.message && !/^Error \d+$/.test(error.message) ? error.message : 'Ya existe un registro con esos datos.'}`
    case 429:
      return `${base} Hiciste muchas solicitudes seguidas; espera un momento e inténtalo de nuevo.`
    default:
      if (error.status >= 500) {
        return `${base} El servicio tuvo un problema temporal; inténtalo de nuevo en unos minutos.`
      }
      return `${base} ${error.message || 'Inténtalo de nuevo.'}`
  }
}

/**
 * Lleva el foco al primer campo con error tras validar un formulario.
 * @param {HTMLFormElement | null} formulario
 */
export function enfocarPrimerError(formulario) {
  if (!formulario) return
  requestAnimationFrame(() => {
    const campo = formulario.querySelector('[aria-invalid="true"]')
    if (campo && typeof campo.focus === 'function') {
      campo.focus()
      campo.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }
  })
}
