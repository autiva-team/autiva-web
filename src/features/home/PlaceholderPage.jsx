import Icon from '../../components/Icons'
import './PlaceholderPage.css'

const contenido = {
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
  gastos: {
    titulo: 'Gastos',
    descripcion: 'Visualiza en qué se va tu dinero y mantén tu presupuesto bajo control.',
    icon: 'wallet',
    tono: 'azul',
    puntos: ['Gastos por categoría', 'Resumen mensual', 'Comparativo de costos'],
  },
  recordatorios: {
    titulo: 'Recordatorios',
    descripcion: 'Programa avisos para no olvidar trámites ni servicios.',
    icon: 'bell',
    tono: 'violeta',
    puntos: ['Verificación y tenencia', 'Cambio de aceite', 'Notificaciones push'],
  },
  estadisticas: {
    titulo: 'Estadísticas',
    descripcion: 'Conoce la eficiencia de tu vehículo con datos claros y visuales.',
    icon: 'chart',
    tono: 'cian',
    puntos: ['Kilómetros recorridos', 'Costo de operación', 'Tendencias mensuales'],
  },
}

export default function PlaceholderPage({ seccion, onInicio }) {
  const info = contenido[seccion] || contenido.gasolina

  return (
    <div className="placeholder-page">
      <section className="placeholder-hero">
        <span className={`placeholder-icono tono-${info.tono}`}>
          <Icon name={info.icon} size={30} />
        </span>
        <span className="placeholder-tag">Próximamente</span>
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
