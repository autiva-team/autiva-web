import { useEffect, useId, useRef } from 'react'

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal accesible:
 * - Se anuncia como diálogo (role="dialog" + aria-modal).
 * - El foco entra al abrirse, queda atrapado dentro y se devuelve
 *   al elemento que lo abrió al cerrarse.
 * - Se cierra con Escape y con clic en el fondo.
 */
export default function Modal({ titulo, onCerrar, children, className = '' }) {
  const idTitulo = useId()
  const tarjetaRef = useRef(null)
  const focoPrevioRef = useRef(null)
  // Se guarda en ref para que el efecto corra una sola vez al abrir:
  // si dependiera de onCerrar, cada render movería el foco al inicio.
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    focoPrevioRef.current = document.activeElement

    const tarjeta = tarjetaRef.current
    if (tarjeta) {
      const primero = tarjeta.querySelector(SELECTOR_ENFOCABLE)
      if (primero) primero.focus()
      else tarjeta.focus()
    }

    const onTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        onCerrarRef.current()
        return
      }
      if (evento.key !== 'Tab') return

      const enfocables = Array.from(tarjetaRef.current.querySelectorAll(SELECTOR_ENFOCABLE))
      if (enfocables.length === 0) return

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const activo = document.activeElement

      if (evento.shiftKey && activo === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', onTecla)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onTecla)
      document.body.style.overflow = prevOverflow
      if (focoPrevioRef.current && typeof focoPrevioRef.current.focus === 'function') {
        focoPrevioRef.current.focus()
      }
    }
  }, [])

  return (
    <div className="modal-overlay">
      {/* Fondo: botón nativo que cierra el diálogo al tocar fuera.
          Queda fuera del orden de tabulación; con teclado se usa Escape
          o el botón «Cerrar diálogo». */}
      <button
        type="button"
        className="modal-fondo"
        aria-label="Cerrar diálogo"
        tabIndex={-1}
        onClick={() => onCerrarRef.current()}
      />
      <div
        ref={tarjetaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`modal-card ${className}`}
      >
        <div className="modal-head">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="modal-close" onClick={onCerrar} aria-label="Cerrar diálogo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
