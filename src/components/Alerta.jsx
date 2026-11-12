import Icon from './Icons'

const ICONOS = {
  exito: 'check-circulo',
  error: 'alerta-circulo',
  aviso: 'alert',
  info: 'info',
}

/**
 * Alerta de resultado: comunica qué ocurrió y, cuando es un error,
 * cómo corregirlo. Los errores se anuncian de forma asertiva.
 * `accion` permite ofrecer el siguiente paso (p. ej. «Reintentar»).
 *
 * Uso: <Alerta tipo="error" titulo="No se pudo guardar">Revisa el correo e inténtalo nuevamente.</Alerta>
 */
export default function Alerta({ tipo = 'info', titulo, children, accion, className = '', ...resto }) {
  const semantica = tipo === 'error' || tipo === 'aviso' ? 'alert' : 'status'
  return (
    <div className={`alerta alerta--${tipo} ${className}`.trim()} role={semantica} {...resto}>
      <Icon name={ICONOS[tipo] || ICONOS.info} size={20} />
      <div>
        {titulo && <strong>{titulo}</strong>}
        {children && <div className="alerta-texto">{children}</div>}
        {accion && <div className="alerta-accion">{accion}</div>}
      </div>
    </div>
  )
}
