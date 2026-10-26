import Icon from '../../components/Icons'
import './VehiculosPage.css'

export default function VehiculosPage({ vehiculos = [], fotos = {}, onRegistrarVehiculo }) {
  return (
    <div className="vehiculos-page">
      <section className="page-head">
        <div>
          <h2>Mis Vehículos</h2>
          <p>
            {vehiculos.length > 0
              ? `${vehiculos.length} vehículo${vehiculos.length === 1 ? '' : 's'} en tu expediente.`
              : 'El expediente de cada auto que manejas.'}
          </p>
        </div>
        <button type="button" className="accion-principal compacta" onClick={onRegistrarVehiculo}>
          <Icon name="plus" size={18} />
          Agregar
        </button>
      </section>

      {vehiculos.length > 0 ? (
        <div className="vehiculos-lista">
          {vehiculos.map((vehiculo) => {
            const foto = fotos[vehiculo.id]
            return (
              <article key={vehiculo.id} className="vehiculo-ficha">
                <div className="ficha-head">
                  {foto ? (
                    <img
                      src={foto}
                      alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                      className="ficha-foto"
                    />
                  ) : (
                    <span className="ficha-icono">
                      <Icon name="car" size={26} />
                    </span>
                  )}
                  <div>
                    <h3>
                      {vehiculo.marca} {vehiculo.modelo}
                    </h3>
                    <p>
                      {vehiculo.anio} · {vehiculo.color || 'Sin color'}
                    </p>
                  </div>
                  <span className="badge-activo">
                    {vehiculo.esPrincipal ? 'Principal' : 'Activo'}
                  </span>
                </div>

                <div className="ficha-datos">
                  <div>
                    <span>Placas</span>
                    <strong>{vehiculo.placas}</strong>
                  </div>
                  <div>
                    <span>Odómetro</span>
                    <strong>
                      {Number(
                        vehiculo.odometroActual ?? vehiculo.kilometrajeInicial ?? 0
                      ).toLocaleString('es-MX')}{' '}
                      km
                    </strong>
                  </div>
                  <div>
                    <span>Estatus</span>
                    <strong>{vehiculo.estatus || 'Activo'}</strong>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <section className="vehiculos-vacio">
          <span className="vacio-icono">
            <Icon name="car" size={28} />
          </span>
          <h3>Sin vehículos registrados</h3>
          <p>Agrega tu primer vehículo para llevar su historial completo.</p>
          <button type="button" className="accion-principal" onClick={onRegistrarVehiculo}>
            Registrar vehículo
          </button>
        </section>
      )}
    </div>
  )
}
