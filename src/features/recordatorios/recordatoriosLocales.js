// Recordatorios creados desde este dispositivo.
// La API publicada permite crear recordatorios (POST .../fecha y .../kilometraje)
// pero todavía no listarlos; por eso se guarda la respuesta de cada creación
// para poder mostrarla. Los datos vienen del servidor, no son de ejemplo.

const CLAVE = 'autiva_recordatorios_creados'

function usuarioActualId() {
  try {
    return JSON.parse(localStorage.getItem('autiva_usuario') || 'null')?.id || 'anonimo'
  } catch {
    return 'anonimo'
  }
}

function leerTodo() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '{}')
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
  } catch {
    return {}
  }
}

/** Recordatorios creados por la persona usuaria actual (opcionalmente de un vehículo). */
export function leerRecordatoriosCreados(vehiculoId) {
  const lista = leerTodo()[usuarioActualId()]
  const validos = Array.isArray(lista) ? lista : []
  return vehiculoId ? validos.filter((r) => r.vehiculoId === vehiculoId) : validos
}

/** Guarda la respuesta de la API al crear un recordatorio (sin duplicar por id). */
export function guardarRecordatorioCreado(recordatorio) {
  if (!recordatorio?.id) return
  const todo = leerTodo()
  const usuario = usuarioActualId()
  const lista = Array.isArray(todo[usuario]) ? todo[usuario] : []
  todo[usuario] = [recordatorio, ...lista.filter((r) => r.id !== recordatorio.id)].slice(0, 100)
  try {
    localStorage.setItem(CLAVE, JSON.stringify(todo))
  } catch {
    // Sin almacenamiento disponible: el recordatorio sigue guardado en el servidor.
  }
}

function diasEntre(desde, hasta) {
  const inicio = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const [anio, mes, dia] = String(hasta).slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(anio, mes - 1, dia) - inicio) / 86400000)
}

/**
 * Calcula el estado igual que la API: por fecha vence si faltan menos de 0 días
 * y está próximo dentro de la anticipación; por kilometraje vence al alcanzar
 * la meta y está próximo a 500 km o menos.
 */
export function calcularEstadoLocal(recordatorio, odometroActual = 0, hoy = new Date()) {
  const base = { ...recordatorio, estado: recordatorio.estado || 'pendiente' }
  if (recordatorio.criterio === 'por_fecha' && recordatorio.fechaLimite) {
    const diasRestantes = diasEntre(hoy, recordatorio.fechaLimite)
    const estaVencido = diasRestantes < 0
    return {
      ...base,
      diasRestantes,
      kmRestantes: null,
      estaVencido,
      proximoAVencer: !estaVencido && diasRestantes <= Number(recordatorio.anticipacionDias || 7),
    }
  }
  if (recordatorio.criterio === 'por_kilometraje' && recordatorio.kmObjetivo != null) {
    const kmRestantes = Number(recordatorio.kmObjetivo) - Number(odometroActual || 0)
    const estaVencido = kmRestantes <= 0
    return { ...base, diasRestantes: null, kmRestantes, estaVencido, proximoAVencer: !estaVencido && kmRestantes <= 500 }
  }
  return { ...base, diasRestantes: null, kmRestantes: null, estaVencido: false, proximoAVencer: false }
}
