import Icon from '../../components/Icons'
import EncabezadoPagina from '../../components/EncabezadoPagina'
import EstadoVacio from '../../components/EstadoVacio'
import { nombreVehiculo } from '../../utils/vehiculo'

const DESCRIPCION = 'Seguro, verificación, tenencia y servicios: te avisamos antes de que venzan.'
export const TODOS_LOS_VEHICULOS = 'todos'

/** Encabezado común: selector de vehículo y botón «Nuevo recordatorio». */
export default function EncabezadoRecordatorios({ vehiculos, vehiculoId, onCambiarVehiculo, onNuevo, incluirTodos = false }) {
  return (
    <EncabezadoPagina titulo="Recordatorios" descripcion={DESCRIPCION}>
      {(vehiculos.length > 1 || incluirTodos) && (
        <label className="mes-selector">
          <span>Vehículo</span>
          <select className="selector-vehiculo" value={vehiculoId} onChange={(evento) => onCambiarVehiculo(evento.target.value)}>
            {incluirTodos && vehiculos.length > 1 && <option value={TODOS_LOS_VEHICULOS}>Todos mis vehículos</option>}
            {vehiculos.map((vehiculo) => (
              <option key={vehiculo.id} value={vehiculo.id}>
                {nombreVehiculo(vehiculo)}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="button" className="btn btn--primario" onClick={onNuevo}>
        <Icon name="plus" size={18} />
        Nuevo recordatorio
      </button>
    </EncabezadoPagina>
  )
}

/** Pantalla cuando aún no hay vehículos registrados. */
export function RecordatoriosSinVehiculos() {
  return (
    <div className="recordatorios-page contenedor">
      <EncabezadoPagina titulo="Recordatorios" descripcion={DESCRIPCION} />
      <EstadoVacio
        icono="car"
        titulo="Primero registra un vehículo"
        texto="Los recordatorios se asignan a un vehículo. Regístralo y vuelve aquí para crear el primero."
      />
    </div>
  )
}
