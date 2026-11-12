import Icon from '../../components/Icons'
import { categoriaRecordatorio } from './recordatoriosApi'
import { detalleFecha } from './recordatoriosUi'

/**
 * Tarjeta de un recordatorio en la lista. `extraMeta` agrega texto a la línea
 * de categoría (p. ej. el vehículo) y `children` son las acciones.
 */
export default function TarjetaRecordatorio({ recordatorio, extraMeta, children }) {
  const categoria = categoriaRecordatorio(recordatorio.tipo)
  const concluido = recordatorio.estado === 'concluido'
  return (
    <li className={`recordatorio-card ${concluido ? 'hecho' : recordatorio.estadoUi.tono}`}>
      <span
        className="recordatorio-icono"
        style={{ background: `${categoria.color}1f`, color: categoria.color }}
        aria-hidden="true"
      >
        <Icon name={categoria.icon} size={20} />
      </span>

      <div className="recordatorio-info">
        <div className="recordatorio-titulo-row">
          <h3 className="recordatorio-titulo">{recordatorio.titulo}</h3>
          <span className={`recordatorio-badge ${recordatorio.estadoUi.tono}`}>{recordatorio.estadoUi.etiqueta}</span>
        </div>
        <p className="recordatorio-meta">
          {categoria.nombre} · {detalleFecha(recordatorio)}
          {extraMeta}
          {recordatorio.pushPrioritaria && <span className="recordatorio-badge-prioridad">Prioritario</span>}
        </p>
        <p className="recordatorio-estado">{recordatorio.estadoUi.detalle}</p>
      </div>

      {children && <div className="recordatorio-acciones">{children}</div>}
    </li>
  )
}
