import { useId, useState } from 'react'

const moneda = (valor) => Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const mes = (dato) => new Date(dato.anio, dato.mes - 1).toLocaleDateString('es-MX', { month: 'short' })

export function GraficaRendimiento({ datos = [], promedio, formatear }) {
  const id = useId()
  const [seleccion, setSeleccion] = useState(null)
  const validos = datos.filter((d) => d.kmL != null && Number.isFinite(Number(d.kmL)))
  const maximo = Math.max(1, ...validos.map((d) => Number(d.kmL)), promedio || 0) * 1.2
  const x = (i) => 56 + (datos.length === 1 ? 260 : i * 520 / Math.max(1, datos.length - 1))
  const y = (valor) => 210 - Number(valor) / maximo * 172
  const segmentos = []
  datos.forEach((d, i) => {
    if (d.kmL == null) return
    if (i === 0 || datos[i - 1].kmL == null) segmentos.push([])
    segmentos[segmentos.length - 1].push(`${x(i)},${y(d.kmL)}`)
  })
  const elegido = seleccion == null ? null : datos[seleccion]
  return <article className="grafica-card tarjeta">
    <div className="grafica-cabecera"><div><span className="grafica-eyebrow">Eficiencia</span><h3>Rendimiento mes a mes</h3></div><span className="grafica-etiqueta">{validos.length} meses con datos</span></div>
    <p className="grafica-descripcion">Compara cómo aprovechas cada carga de combustible.</p>
    {validos.length ? <>
      <svg className="grafica-linea" viewBox="0 0 640 260" role="img" aria-labelledby={`${id}-titulo ${id}-descripcion`}>
        <title id={`${id}-titulo`}>Rendimiento mensual</title><desc id={`${id}-descripcion`}>Los meses sin datos interrumpen la línea. La línea punteada indica el promedio del periodo.</desc>
        {[0, 1, 2, 3].map((i) => <g key={i}><line className="grafica-rejilla" x1="56" x2="590" y1={y(maximo * i / 3)} y2={y(maximo * i / 3)} /><text className="grafica-eje" x="46" y={y(maximo * i / 3) + 4} textAnchor="end">{formatear(maximo * i / 3).split(' ')[0]}</text></g>)}
        {promedio != null && <line className="grafica-promedio" x1="56" x2="590" y1={y(promedio)} y2={y(promedio)} />}
        {segmentos.map((puntos, i) => <polyline key={i} points={puntos.join(' ')} className="grafica-trazo" />)}
        {datos.map((d, i) => <g key={`${d.anio}-${d.mes}`}><text className="grafica-eje" x={x(i)} y="242" textAnchor="middle">{mes(d)}</text>{d.kmL != null && <g tabIndex="0" role="button" aria-label={`${mes(d)} ${d.anio}: ${formatear(d.kmL)}`} onFocus={() => setSeleccion(i)} onMouseEnter={() => setSeleccion(i)} onClick={() => setSeleccion(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccion(i) } }}><circle cx={x(i)} cy={y(d.kmL)} r="16" className="grafica-zona" /><circle cx={x(i)} cy={y(d.kmL)} r={seleccion === i ? 7 : 5} className="grafica-punto" /><title>{formatear(d.kmL)}</title></g>}</g>)}
      </svg>
      <div className="grafica-pie" aria-live="polite"><span><i className="leyenda-linea" />{elegido ? `${mes(elegido)} ${elegido.anio}: ${formatear(elegido.kmL)}` : 'Selecciona un punto para ver el detalle'}</span><span><i className="leyenda-promedio" />Promedio: {formatear(promedio)}</span></div>
    </> : <div className="grafica-sin-datos"><span className="grafica-vacia-icono">↗</span><strong>Tu tendencia empieza con tus cargas</strong><p>Registra cargas con el tanque lleno para ver tu rendimiento.</p></div>}
    <details className="grafica-tabla"><summary>Ver datos por mes</summary><table><caption className="sr-only">Valores de rendimiento mensual</caption><thead><tr><th scope="col">Mes</th><th scope="col">Rendimiento</th></tr></thead><tbody>{datos.map((d) => <tr key={`${d.anio}-${d.mes}`}><th scope="row">{mes(d)} {d.anio}</th><td>{d.kmL == null ? 'Sin datos' : formatear(d.kmL)}</td></tr>)}</tbody></table></details>
  </article>
}

export function GraficaGastos({ desglose = [], total = 0, etiqueta = 'Este mes' }) {
  const categorias = desglose.filter((c) => Number(c.monto) > 0)
  const suma = categorias.reduce((acumulado, c) => acumulado + Number(c.monto), 0)
  const segmentos = categorias.map((c, i) => {
    const porcentaje = suma ? Number(c.monto) / suma * 100 : 0
    const inicio = suma ? categorias.slice(0, i).reduce((acumulado, categoria) => acumulado + Number(categoria.monto), 0) / suma * 100 : 0
    return { ...c, porcentaje, inicio, color: `var(--grafica-${i % 6 + 1})` }
  })
  return <article className="grafica-card tarjeta">
    <div className="grafica-cabecera"><div><span className="grafica-eyebrow">Distribución</span><h3>¿En qué se va tu dinero?</h3></div><span className="grafica-etiqueta">{etiqueta}</span></div>
    <p className="grafica-descripcion">Combustible, servicios y otros gastos de tu vehículo.</p>
    <div className="grafica-dona-contenido">
      <div className="grafica-dona"><svg viewBox="0 0 120 120" role="img" aria-label={`Distribución de gastos: ${moneda(total)}`}><circle className="grafica-dona-fondo" cx="60" cy="60" r="47" />{segmentos.map((c) => <circle key={c.categoria} cx="60" cy="60" r="47" pathLength="100" fill="none" stroke={c.color} strokeWidth="13" strokeDasharray={`${c.porcentaje} ${100 - c.porcentaje}`} strokeDashoffset={-c.inicio} transform="rotate(-90 60 60)"><title>{c.categoria}: {moneda(c.monto)} ({c.porcentaje.toFixed(1)} %)</title></circle>)}</svg><div><small>Total del mes</small><strong>{moneda(total)}</strong></div></div>
      <ul className="grafica-leyenda">{segmentos.map((c) => <li key={c.categoria}><i style={{ background: c.color }} /><span>{c.categoria}<small>{c.porcentaje.toFixed(1)} % del total</small></span><strong>{moneda(c.monto)}</strong></li>)}{!segmentos.length && <li className="texto-secundario">Aún no hay gastos registrados en este mes.</li>}</ul>
    </div>
  </article>
}
