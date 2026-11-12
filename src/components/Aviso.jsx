import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icons'

/**
 * Sistema de avisos (toasts) accesible.
 *
 * `useAviso()` expone `avisar(mensaje, tipo)`:
 *   - tipo 'exito' | 'error' | 'aviso' | 'info' (por defecto 'exito').
 * Los mensajes de error se anuncian de forma asertiva (role="alert")
 * y el resto de forma cortés (role="status").
 */
const ContextoAvisos = createContext(null)

const DURACION_AVISO = 6000
const DURACION_ERROR = 12000

function Aviso({ aviso, onCerrar }) {
  const clases = {
    exito: 'toast toast--exito',
    error: 'toast toast--error',
    aviso: 'toast toast--aviso',
    info: 'toast toast--info',
  }

  const iconos = {
    exito: 'check-circulo',
    error: 'alerta-circulo',
    aviso: 'alert',
    info: 'info',
  }

  return (
    <div className={clases[aviso.tipo] || clases.exito} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      <Icon name={iconos[aviso.tipo] || iconos.exito} size={18} />
      <p>{aviso.mensaje}</p>
      <button type="button" onClick={() => onCerrar(aviso.id)} aria-label="Cerrar aviso">
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}

export function AvisoProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const contadorRef = useRef(0)

  const cerrar = useCallback((id) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id))
  }, [])

  const temporizadoresRef = useRef(new Map())

  const avisar = useCallback((mensaje, tipo = 'exito') => {
    if (!mensaje) return
    contadorRef.current += 1
    const id = contadorRef.current
    setAvisos((actuales) => [...actuales.slice(-2), { id, mensaje, tipo }])
    // Cada aviso tiene su propio tiempo; los errores duran más
    // para que haya tiempo de leer cómo resolverlos.
    const duracion = tipo === 'error' ? DURACION_ERROR : DURACION_AVISO
    temporizadoresRef.current.set(
      id,
      setTimeout(() => {
        temporizadoresRef.current.delete(id)
        cerrar(id)
      }, duracion)
    )
  }, [cerrar])

  useEffect(() => {
    const temporizadores = temporizadoresRef.current
    return () => temporizadores.forEach(clearTimeout)
  }, [])

  const valor = useMemo(() => ({ avisar }), [avisar])

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div className="toast-region" role="region" aria-label="Avisos de la aplicación">
        {avisos.map((aviso) => (
          <Aviso key={aviso.id} aviso={aviso} onCerrar={cerrar} />
        ))}
      </div>
    </ContextoAvisos.Provider>
  )
}

export function useAviso() {
  const contexto = useContext(ContextoAvisos)
  if (!contexto) {
    throw new Error('useAviso debe usarse dentro de <AvisoProvider>')
  }
  return contexto
}
