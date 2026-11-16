import { useEffect, useState } from 'react'
import { obtenerPreferencias } from '../features/perfil/perfilApi'
export function useUnidades() {
  const [unidad, setUnidad] = useState(() => localStorage.getItem('autiva_unidad') || 'km_l')
  useEffect(() => {
    let activo = true
    const actualizar = () => setUnidad(localStorage.getItem('autiva_unidad') || 'km_l')
    obtenerPreferencias().then((datos) => { if (activo) { localStorage.setItem('autiva_unidad', datos.unidadMedida); actualizar() } }).catch(() => {})
    window.addEventListener('autiva:preferencias', actualizar)
    return () => { activo = false; window.removeEventListener('autiva:preferencias', actualizar) }
  }, [])
  return { rendimiento: (n) => n == null ? '—' : `${(Number(n) * (unidad === 'mpg' ? 2.352 : 1)).toFixed(1)} ${unidad === 'mpg' ? 'mpg' : 'km/L'}`, distancia: (n) => n == null ? '—' : `${(Number(n) * (unidad === 'mpg' ? 0.6214 : 1)).toLocaleString('es-MX', { maximumFractionDigits: 0 })} ${unidad === 'mpg' ? 'mi' : 'km'}` }
}
