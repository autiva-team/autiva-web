import Icon from './Icons'

/**
 * Bloque para funciones que aún no tienen endpoint en la API.
 * Dice con claridad que la función no está disponible, qué incluirá
 * y ofrece una alternativa para continuar.
 */
export default function Proximamente({ icono = 'spark', titulo, texto, incluira = [], children }) {
  return (
    <section className="proximamente" aria-labelledby="titulo-proximamente">
      <span className="proximamente-icono" aria-hidden="true">
        <Icon name={icono} size={30} />
      </span>
      <span className="proximamente-etiqueta">Próximamente</span>
      <h2 id="titulo-proximamente">{titulo}</h2>
      {texto && <p>{texto}</p>}
      {incluira.length > 0 && (
        <ul aria-label="Lo que incluirá">
          {incluira.map((elemento) => (
            <li key={elemento}>{elemento}</li>
          ))}
        </ul>
      )}
      {children && <div className="proximamente-acciones">{children}</div>}
    </section>
  )
}
