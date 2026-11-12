/**
 * Fondo dinámico decorativo: manchas de color de la paleta (cobalto,
 * cyan, menta y un toque ámbar) que se desplazan lentamente.
 * - variante "suave": detrás de la app, casi imperceptible.
 * - variante "intensa": pantallas de acceso, más color y movimiento.
 * Es puramente decorativo (aria-hidden) y se detiene si la persona
 * pidió reducir el movimiento.
 */
export default function FondoDinamico({ variante = 'suave' }) {
  return (
    <div className={`fondo-dinamico fondo-dinamico--${variante}`} aria-hidden="true">
      <span className="fondo-mancha fondo-mancha--cobalto" />
      <span className="fondo-mancha fondo-mancha--cyan" />
      <span className="fondo-mancha fondo-mancha--menta" />
      <span className="fondo-mancha fondo-mancha--ambar" />
      <span className="fondo-reticula" />
    </div>
  )
}
