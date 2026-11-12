import EncabezadoPagina from '../../components/EncabezadoPagina'
import Proximamente from '../../components/Proximamente'
import Icon from '../../components/Icons'

/**
 * Gastos generales (seguro, tenencia, estacionamiento…).
 * La API aún no tiene un recurso de gastos, así que la sección
 * se anuncia como «Próximamente» en lugar de mostrar datos de ejemplo.
 */
export default function GastosPage({ onNavegar }) {
  return (
    <div className="contenedor">
      <EncabezadoPagina titulo="Gastos" descripcion="Todo lo que pagas por tu vehículo, en un solo lugar." />

      <Proximamente
        icono="wallet"
        titulo="El control de gastos llegará pronto"
        texto="Podrás anotar seguros, verificaciones, tenencias, estacionamientos y otros pagos para ver cuánto te cuesta tu vehículo cada mes."
        incluira={['Registro de gastos por categoría', 'Total mensual y comparativo', 'Distribución de tus gastos']}
      >
        {onNavegar && (
          <>
            <button type="button" className="btn btn--primario" onClick={() => onNavegar('gasolina')}>
              <Icon name="fuel" size={18} />
              Ver gasto en combustible
            </button>
            <button type="button" className="btn btn--secundario" onClick={() => onNavegar('mantenimiento')}>
              <Icon name="wrench" size={18} />
              Ver servicios
            </button>
          </>
        )}
      </Proximamente>
    </div>
  )
}
