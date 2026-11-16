import { db } from '../../offline/db'
import { cuentaActual } from '../../offline/cuenta'

export const EVENTO_FOTOS = 'autiva:fotos'

export async function guardarFotoVehiculo(vehiculoId, imagen) {
  const cuentaId = cuentaActual()
  await db.fotosVehiculos.put({ cuentaId, vehiculoId, imagen })
  // Solicitud al navegador para evitar la expulsión automática por falta de espacio.
  // No impide que el usuario borre los datos del sitio ni sustituye un respaldo remoto.
  try { await navigator.storage?.persist?.() } catch { /* Algunos navegadores no conceden persistencia. */ }
  const guardada = await db.fotosVehiculos.get([cuentaId, vehiculoId])
  if (guardada?.imagen !== imagen) throw new Error('No se pudo verificar el guardado de la foto.')
  window.dispatchEvent(new Event(EVENTO_FOTOS))
}

export async function eliminarFotoVehiculo(vehiculoId) {
  const cuentaId = cuentaActual()
  const vinculados = await db.vehiculosVinculados.where('cuentaId').equals(cuentaId).toArray()
  const ids = [vehiculoId, ...vinculados.filter((v) => v.servidorId === vehiculoId).map((v) => v.id)]
  await db.fotosVehiculos.bulkDelete(ids.map((id) => [cuentaId, id]))
  window.dispatchEvent(new Event(EVENTO_FOTOS))
}

export async function leerFotosVehiculos() {
  const cuentaId = cuentaActual()
  const [fotos, vinculados] = await Promise.all([
    db.fotosVehiculos.where('cuentaId').equals(cuentaId).toArray(),
    db.vehiculosVinculados.where('cuentaId').equals(cuentaId).toArray(),
  ])
  const resultado = Object.fromEntries(fotos.map((f) => [f.vehiculoId, f.imagen]))
  for (const vinculo of vinculados) {
    if (resultado[vinculo.id] && !resultado[vinculo.servidorId]) resultado[vinculo.servidorId] = resultado[vinculo.id]
  }
  return resultado
}

// Se reduce antes de persistir: no se envían imágenes base64 al campo URL de la API.
export async function prepararFoto(archivo) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(archivo.type)) throw new Error('Elige una imagen JPG, PNG, WebP o AVIF.')
  if (archivo.size > 15 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 15 MB.')
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = new Image()
    imagen.src = url
    await imagen.decode()
    const escala = Math.min(1, 1440 / Math.max(imagen.naturalWidth, imagen.naturalHeight))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala))
    lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala))
    const contexto = lienzo.getContext('2d')
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, lienzo.width, lienzo.height)
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
    return lienzo.toDataURL('image/jpeg', .82)
  } catch { throw new Error('No se pudo leer esta imagen. Intenta con otra foto.') }
  finally { URL.revokeObjectURL(url) }
}
