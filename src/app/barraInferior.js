/**
 * Decide si la barra de navegación inferior debe verse.
 *
 * - Al desplazarse hacia abajo (leyendo) se oculta para no tapar contenido.
 * - Al desplazarse hacia arriba, cerca del inicio o al llegar al final de la
 *   página, vuelve a mostrarse para que la navegación siga a la mano.
 * - Movimientos mínimos (menos de `umbral` px) no cambian el estado.
 */
export function barraVisible({ anterior, actual, alturaVista, alturaTotal, visible, umbral = 8, margenInicio = 80, margenFinal = 24 }) {
  if (actual <= margenInicio) return true
  if (actual + alturaVista >= alturaTotal - margenFinal) return true
  const delta = actual - anterior
  if (Math.abs(delta) < umbral) return visible
  return delta < 0
}
