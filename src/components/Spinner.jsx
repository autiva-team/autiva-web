/**
 * Spinner: indicador de progreso para operaciones en curso.
 * Se muestra dentro de botones o junto a texto de estado.
 */
export default function Spinner({ size = 18, grosor = 2.4 }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="progressbar"
      aria-hidden="true"
      style={{ animation: 'girar 0.8s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray="42 15"
      />
    </svg>
  )
}
