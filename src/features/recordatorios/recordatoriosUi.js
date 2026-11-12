// Utilidades de presentación compartidas por las pantallas de recordatorios.

export const ORDEN_ESTADO = { vencido: 0, proximo: 1, vigente: 2, neutro: 3, hecho: 4 }

export function fechaHoy(hoy = new Date()) {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

export function formatearFecha(fecha) {
  if (!fecha) return ''
  return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formVacio(vehiculoPredeterminadoId = '') {
  return {
    vehiculoId: vehiculoPredeterminadoId,
    titulo: '',
    categoria: 'seguro',
    tipo: 'fecha',
    fecha: '',
    kilometraje: '',
    anticipacionDias: 7,
    pushPrioritaria: false,
  }
}

/** «Vence el 20 nov 2026» o «Meta: 65,000 km». */
export function detalleFecha(recordatorio) {
  const porFecha = recordatorio.criterio === 'por_fecha' || (!recordatorio.criterio && recordatorio.fechaLimite)
  if (porFecha) {
    return recordatorio.fechaLimite ? `Vence el ${formatearFecha(recordatorio.fechaLimite)}` : 'Sin fecha definida'
  }
  return `Meta: ${Number(recordatorio.kmObjetivo || 0).toLocaleString('es-MX')} km`
}

export function odometroDe(vehiculo) {
  return Number(vehiculo?.odometroActual ?? vehiculo?.kilometrajeInicial ?? 0)
}

/** Ordena por urgencia (vencido → próximo → al día) y luego por fecha. */
export function ordenarPorUrgencia(a, b) {
  const ordenA = ORDEN_ESTADO[a.estadoUi?.tono] ?? 9
  const ordenB = ORDEN_ESTADO[b.estadoUi?.tono] ?? 9
  if (ordenA !== ordenB) return ordenA - ordenB
  return String(a.fechaLimite || '').localeCompare(String(b.fechaLimite || ''))
}

/**
 * Valida el formulario de alta. Devuelve un objeto con un mensaje por campo
 * (vacío si todo es correcto).
 */
export function validarRecordatorio(form, { vehiculoDestino, hoy = fechaHoy() } = {}) {
  const errores = {}
  const kilometraje = Number(form.kilometraje)

  if (!form.vehiculoId) errores.vehiculoId = 'Elige a qué vehículo corresponde el recordatorio.'

  const titulo = form.titulo.trim()
  if (!titulo) errores.titulo = 'Escribe qué hay que hacer (ej. Renovar seguro) o elige una sugerencia.'
  else if (titulo.length > 120) errores.titulo = 'Usa máximo 120 caracteres.'

  if (form.tipo === 'fecha') {
    if (!form.fecha) errores.fecha = 'Elige la fecha límite del trámite o servicio.'
    else if (form.fecha < hoy) errores.fecha = 'La fecha ya pasó; elige hoy o una fecha futura.'
  } else {
    const base = odometroDe(vehiculoDestino)
    if (form.kilometraje === '' || !Number.isInteger(kilometraje) || kilometraje <= 0) {
      errores.kilometraje = 'Escribe a qué kilometraje quieres el aviso, sin decimales (ej. 65000).'
    } else if (kilometraje <= base) {
      errores.kilometraje = `Debe ser mayor al kilometraje actual del vehículo (${base.toLocaleString('es-MX')} km).`
    }
  }
  return errores
}
