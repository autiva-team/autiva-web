import Icon from './Icons'

/**
 * Encabezado de página consistente en toda la app:
 * - «Volver» siempre arriba a la izquierda (mismo lugar, misma forma).
 * - Un solo h1 por pantalla.
 * - Descripción breve con el contexto (p. ej. el vehículo).
 * - Acciones a la derecha (en móvil, debajo y a lo ancho).
 */
export default function EncabezadoPagina({
  titulo,
  descripcion,
  eyebrow,
  onVolver,
  textoVolver = 'Volver',
  children,
  id,
}) {
  return (
    <header className="page-head">
      <div>
        {onVolver && (
          <button type="button" className="volver" onClick={onVolver}>
            <Icon name="chevron-izquierda" size={18} />
            {textoVolver}
          </button>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 id={id}>{titulo}</h1>
        {descripcion && <p className="page-subtitulo">{descripcion}</p>}
      </div>
      {children && <div className="page-head-acciones">{children}</div>}
    </header>
  )
}
