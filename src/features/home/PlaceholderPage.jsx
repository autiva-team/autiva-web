import Icon from '../../components/Icons'
import './PlaceholderPage.css'

const contenido = {
  gastos: {
    titulo: 'Control de Gastos',
    descripcion: 'Esta funcionalidad se encuentra en desarrollo próximamente ya que aún no cuenta con endpoints en el backend. Estará disponible en una futura actualización de Autiva.',
    icon: 'wallet',
    tono: 'azul',
    puntos: [
      'Registro y categorías de gastos vehiculares',
      'Balance mensual y costo total de posesión',
      'Sincronización directa con la API oficial',
    ],
  },
  estadisticas: {
    titulo: 'Estadísticas e Informes',
    descripcion: 'Esta funcionalidad se encuentra en desarrollo próximamente ya que aún no cuenta con endpoints en el backend. Estará disponible en una futura actualización de Autiva.',
    icon: 'chart',
    tono: 'cian',
    puntos: [
      'Gráficas de consumo y rendimiento mensual',
      'Comparativa de eficiencia entre períodos',
      'Métricas consolidadas de tu expediente vehicular',
    ],
  },
  gasolina: {
    titulo: 'Gasolina',
    descripcion: 'Registra cada carga y descubre el rendimiento real de tu vehículo.',
    icon: 'fuel',
    tono: 'cian',
    puntos: ['Historial de cargas', 'Rendimiento km/L', 'Costo por kilómetro'],
  },
  mantenimiento: {
    titulo: 'Mantenimiento',
    descripcion: 'Lleva el control de servicios y anticipa el próximo mantenimiento.',
    icon: 'wrench',
    tono: 'violeta',
    puntos: ['Servicios realizados', 'Próximo servicio', 'Alertas de cuidado'],
  },
}

export default function PlaceholderPage({ seccion, onInicio }) {
  const info = contenido[seccion] || {
    titulo: 'En desarrollo',
    descripcion: 'Esta funcionalidad se encuentra en desarrollo próximamente.',
    icon: 'spark',
    tono: 'azul',
    puntos: ['Próximamente disponible', 'En integración con la API'],
  }

  return (
    <div className="placeholder-page contenedor">
      <section className="placeholder-hero">
        <span className={`placeholder-icono tono-${info.tono}`}>
          <Icon name={info.icon} size={30} />
        </span>
        <span className="placeholder-tag">Desarrollo próximamente</span>
        <h2>{info.titulo}</h2>
        <p>{info.descripcion}</p>
      </section>

      <section className="placeholder-lista">
        {info.puntos.map((punto) => (
          <div key={punto} className="placeholder-item">
            <span className="placeholder-check">
              <Icon name="spark" size={14} />
            </span>
            <span>{punto}</span>
          </div>
        ))}
      </section>

      <button type="button" className="accion-principal" onClick={onInicio}>
        Volver al inicio
      </button>
    </div>
  )
}
