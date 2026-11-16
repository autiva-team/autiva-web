// Adaptación ligera del patrón Blur Text de React Bits, sin librerías de animación.
export default function TextoAnimado({ texto, className = '' }) {
  const contenido = String(texto ?? '')
  const palabras = contenido.split(' ')
  return <span className={`texto-entrada ${className}`.trim()}>
    <span className="sr-only">{contenido}</span>
    <span aria-hidden="true">{palabras.map((palabra, indice) => <span className="texto-entrada-palabra" key={`${indice}-${palabra}`} style={{ '--entrada-retardo': `${Math.min(indice, 5) * 35}ms` }}>{palabra}{indice < palabras.length - 1 ? ' ' : ''}</span>)}</span>
  </span>
}
