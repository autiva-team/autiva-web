import { db } from './db'
import { cuentaActual } from './cuenta'
import { vehiculoLocal, resolverVehiculoId } from './vehiculosPendientes'

export async function registroLocal(tipo, id) {
  const registro = await (tipo === 'carga' ? db.cargasPendientes : db.serviciosPendientes).get(id)
  if (!registro || registro.cuentaId !== cuentaActual()) return null
  return presentar(tipo, registro)
}
function presentar(tipo, r) {
  return tipo === 'carga' ? { ...r, pendienteSincronizacion: true, tipoCombustible: ['Magna', 'Premium', 'Diésel'][r.tipoCombustibleId - 1] || 'Combustible', precioPorLitro: r.costoTotal / r.litros, rendimientoKml: null } : { ...r, pendienteSincronizacion: true, tipoServicio: ['Aceite y filtros', 'Frenos', 'Llantas', 'Afinación', 'Batería', 'Otro'][r.tipoServicioId - 1] || 'Servicio' }
}
export async function historialConPendientes(tipo, vehiculoId, consultar, pagina, tamano, desde, hasta) {
  const id = await resolverVehiculoId(vehiculoId)
  const tabla = tipo === 'carga' ? db.cargasPendientes : db.serviciosPendientes
  const pendientes = (await tabla.where('vehiculoId').equals(id).toArray())
    .filter((r) => r.cuentaId === cuentaActual() && (!desde || (r.fechaHora || r.fecha).slice(0, 10) >= desde) && (!hasta || (r.fechaHora || r.fecha).slice(0, 10) <= hasta))
    .sort((a, b) => String(b.fechaHora || b.fecha).localeCompare(String(a.fechaHora || a.fecha)))
  let servidor = { items: [], pagina, tamano, totalRegistros: 0, totalPaginas: 0 }
  if (!await vehiculoLocal(id)) {
    try { servidor = await consultar(id) } catch (err) { if (err.status) throw err; if (!pendientes.length && navigator.onLine !== false) throw err }
  }
  const locales = pagina === 1 ? pendientes.map((r) => presentar(tipo, r)) : []
  const items = Array.isArray(servidor?.items) ? servidor.items : []
  return { ...servidor, pagina, tamano, items: [...locales.filter((r) => !items.some((s) => s.id === r.id)), ...items], totalRegistros: (servidor?.totalRegistros || 0) + pendientes.length, totalPaginas: Math.max(servidor?.totalPaginas || 0, pendientes.length ? 1 : 0) }
}
