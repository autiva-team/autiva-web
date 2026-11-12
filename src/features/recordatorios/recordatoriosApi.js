import { request } from '../../api/cliente'

// Catálogos de la interfaz. Los tipos coinciden con los que acepta la API
// (seguro, verificacion, mantenimiento, tenencia, licencia, otro).
export const CATEGORIAS_RECORDATORIO = [
  { id: 'seguro', nombre: 'Seguro', icon: 'shield', color: '#0e7c5a' },
  { id: 'verificacion', nombre: 'Verificación', icon: 'spark', color: '#0e7490' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', icon: 'wrench', color: '#6d28d9' },
  { id: 'tenencia', nombre: 'Tenencia', icon: 'wallet', color: '#a64b06' },
  { id: 'licencia', nombre: 'Licencia', icon: 'documento', color: '#1d4ed8' },
  { id: 'otro', nombre: 'Otro', icon: 'bell', color: '#536173' },
]

export const TITULOS_SUGERIDOS = [
  { titulo: 'Renovar seguro', categoria: 'seguro' },
  { titulo: 'Verificación vehicular', categoria: 'verificacion' },
  { titulo: 'Cambio de aceite', categoria: 'mantenimiento' },
  { titulo: 'Pago de tenencia', categoria: 'tenencia' },
  { titulo: 'Renovar licencia', categoria: 'licencia' },
  { titulo: 'Rotación de llantas', categoria: 'mantenimiento' },
]

export function categoriaRecordatorio(id) {
  return (
    CATEGORIAS_RECORDATORIO.find((categoria) => categoria.id === String(id || '').toLowerCase()) ||
    CATEGORIAS_RECORDATORIO[CATEGORIAS_RECORDATORIO.length - 1]
  )
}

/**
 * Traduce los campos que calcula la API (estaVencido, proximoAVencer,
 * diasRestantes, kmRestantes) a una etiqueta y un tono para la interfaz.
 */
export function estadoRecordatorio(recordatorio) {
  if (recordatorio.estado === 'concluido') {
    return { tono: 'hecho', etiqueta: 'Hecho', detalle: 'Marcado como concluido.' }
  }

  const porFecha = recordatorio.criterio === 'por_fecha'
  const dias = recordatorio.diasRestantes
  const km = recordatorio.kmRestantes

  if (recordatorio.estaVencido) {
    const detalle = porFecha
      ? `Venció hace ${Math.abs(dias ?? 0)} día${Math.abs(dias ?? 0) === 1 ? '' : 's'}.`
      : `Superaste la meta por ${Math.abs(km ?? 0).toLocaleString('es-MX')} km.`
    return { tono: 'vencido', etiqueta: 'Vencido', detalle }
  }

  if (recordatorio.proximoAVencer) {
    const detalle = porFecha
      ? dias === 0
        ? 'Vence hoy.'
        : `Vence en ${dias} día${dias === 1 ? '' : 's'}.`
      : `Faltan ${Number(km ?? 0).toLocaleString('es-MX')} km.`
    return { tono: 'proximo', etiqueta: 'Próximo', detalle }
  }

  if (porFecha && dias != null) {
    return { tono: 'vigente', etiqueta: 'Al día', detalle: `Faltan ${dias} días.` }
  }
  if (!porFecha && km != null) {
    return { tono: 'vigente', etiqueta: 'Al día', detalle: `Faltan ${Number(km).toLocaleString('es-MX')} km.` }
  }
  return { tono: 'neutro', etiqueta: 'Pendiente', detalle: 'Sin fecha ni kilometraje calculado.' }
}

/**
 * Recordatorios de un vehículo (todos los estados).
 * GET /api/vehiculos/{vehiculoId}/recordatorios
 */
export function listarRecordatoriosVehiculo(vehiculoId, { estado, soloVencidos } = {}) {
  const params = new URLSearchParams()
  if (estado) params.set('estado', estado)
  if (soloVencidos) params.set('soloVencidos', 'true')
  const query = params.toString()
  return request(`/api/vehiculos/${vehiculoId}/recordatorios${query ? `?${query}` : ''}`)
}

/**
 * Recordatorios de todos los vehículos del usuario.
 * GET /api/recordatorios (la API filtra «pendiente» por omisión).
 */
export function listarTodosRecordatorios({ estado = 'pendiente', soloVencidos } = {}) {
  const params = new URLSearchParams()
  params.set('estado', estado)
  if (soloVencidos) params.set('soloVencidos', 'true')
  return request(`/api/recordatorios?${params.toString()}`)
}

/**
 * Marca un recordatorio como concluido.
 * PATCH /api/recordatorios/{id}/concluir
 */
export function concluirRecordatorio(id) {
  return request(`/api/recordatorios/${id}/concluir`, { method: 'PATCH' })
}

/**
 * Crea un recordatorio basado en fecha límite para el vehículo.
 * POST /api/vehiculos/{vehiculoId}/recordatorios/fecha
 */
export function crearRecordatorioFecha(vehiculoId, {
  titulo,
  tipo,
  fechaLimite,
  anticipacionDias = 7,
  pushPrioritaria = false,
}) {
  return request(`/api/vehiculos/${vehiculoId}/recordatorios/fecha`, {
    method: 'POST',
    body: JSON.stringify({
      titulo: titulo.trim(),
      tipo: tipo || 'otro',
      fechaLimite,
      anticipacionDias: Number(anticipacionDias) || 7,
      pushPrioritaria: Boolean(pushPrioritaria),
    }),
  })
}

/**
 * Crea un recordatorio basado en objetivo de kilometraje para el vehículo.
 * POST /api/vehiculos/{vehiculoId}/recordatorios/kilometraje
 */
export function crearRecordatorioKilometraje(vehiculoId, {
  titulo,
  tipo,
  kmObjetivo,
  anticipacionDias = 7,
  pushPrioritaria = false,
}) {
  return request(`/api/vehiculos/${vehiculoId}/recordatorios/kilometraje`, {
    method: 'POST',
    body: JSON.stringify({
      titulo: titulo.trim(),
      tipo: tipo || 'mantenimiento',
      kmObjetivo: Number(kmObjetivo),
      anticipacionDias: Number(anticipacionDias) || 7,
      pushPrioritaria: Boolean(pushPrioritaria),
    }),
  })
}
