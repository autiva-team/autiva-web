import { useEffect, useState } from 'react'
// Actualiza las consultas visibles sin desmontar formularios ni perder filtros.
export function useRecargaApi(prefijo = '', escucharPendientes = true) {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let temporizador
    const recargar = (evento) => { if (prefijo && evento.detail?.ruta && !evento.detail.ruta.startsWith(prefijo)) return; clearTimeout(temporizador); temporizador = setTimeout(() => setRevision((n) => n + 1), 80) }
    window.addEventListener('autiva:datos', recargar)
    if (escucharPendientes) window.addEventListener('autiva:pendientes', recargar)
    return () => { clearTimeout(temporizador); window.removeEventListener('autiva:datos', recargar); window.removeEventListener('autiva:pendientes', recargar) }
  }, [prefijo, escucharPendientes])
  return revision
}
