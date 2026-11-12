// Datos de un vehículo listos para mostrar.
// Regla de la interfaz: un dato vacío no se muestra (ni «Sin color» ni
// separadores sueltos), y cada dato aparece una sola vez por tarjeta.

function texto(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

/** Año del modelo; la API lo envía como «anio» (se aceptan variantes). */
export function anioVehiculo(vehiculo) {
  const anio = texto(vehiculo?.anio ?? vehiculo?.año ?? vehiculo?.anioModelo)
  return anio === '0' ? '' : anio
}

export function colorVehiculo(vehiculo) {
  return texto(vehiculo?.color)
}

export function placasVehiculo(vehiculo) {
  return texto(vehiculo?.placas)
}

/** Une solo las partes con contenido: «HGO-123-A · 2020 · Gris». */
export function unirDatos(partes, separador = ' · ') {
  return partes.map(texto).filter(Boolean).join(separador)
}

/**
 * Línea secundaria de un vehículo.
 * Con `sinPlacas` se omiten las placas cuando ya se muestran en otro lugar.
 */
export function detalleVehiculo(vehiculo, { sinPlacas = false } = {}) {
  return unirDatos([
    sinPlacas ? '' : placasVehiculo(vehiculo),
    anioVehiculo(vehiculo),
    colorVehiculo(vehiculo),
  ])
}

/** Nombre completo: «Nissan Versa · HGO-123-A». */
export function nombreVehiculo(vehiculo, { conPlacas = true } = {}) {
  return unirDatos([
    unirDatos([vehiculo?.marca, vehiculo?.modelo], ' '),
    conPlacas ? placasVehiculo(vehiculo) : '',
  ])
}
