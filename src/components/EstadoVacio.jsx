import Icon from './Icons'

/**
 * Estado vacío: explica qué se puede hacer aquí y ofrece
 * la acción que continúa. Se usa cuando una lista no tiene datos.
 */
export default function EstadoVacio({ icono = 'spark', titulo, texto, children }) {
  return (
    <div className="estado-vacio">
      <span className="estado-vacio-icono" aria-hidden="true">
        <Icon name={icono} size={26} />
      </span>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}
