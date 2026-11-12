import Icon from './Icons'
import FondoDinamico from './FondoDinamico'
import { useTema } from '../context/TemaContext'
import './AppShell.css'

/**
 * Pantallas de acceso (iniciar sesión, crear cuenta, recuperar contraseña).
 * Fondo animado con la paleta de Autiva y todo el contenido dentro de
 * una tarjeta de vidrio translúcida: a la izquierda qué ofrece la app,
 * a la derecha una sola tarea con un solo botón principal.
 */
export default function AppShell({ titulo, descripcion, children }) {
  const { tema, alternarTema } = useTema()

  return (
    <div className="auth-shell">
      <FondoDinamico variante="intensa" />

      <a className="skip-link" href="#formulario-acceso">
        Saltar al formulario
      </a>

      <button
        type="button"
        className="icon-button auth-tema-toggle"
        onClick={alternarTema}
        aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        <Icon name={tema === 'dark' ? 'sol' : 'luna'} size={20} />
      </button>

      <main className="auth-main" id="contenido-principal">
        <div className="auth-vidrio">
          <aside className="auth-panel" aria-label="Qué puedes hacer con Autiva">
            <div className="auth-panel-marca">
              <span className="brand-mark" aria-hidden="true">A</span>
              <div>
                <p className="auth-panel-nombre">Autiva</p>
                <p className="auth-panel-lema">Expediente vehicular</p>
              </div>
            </div>

            <div className="auth-panel-hero">
              <p className="auth-panel-titular">Todo el historial de tu vehículo, en orden y en un solo lugar.</p>
              <p className="auth-panel-texto">
                Registra combustible y servicios en segundos y recibe recordatorios antes de cada vencimiento.
              </p>
            </div>

            <ul className="auth-panel-lista">
              <li>
                <span className="auth-panel-icono icono-menta" aria-hidden="true"><Icon name="fuel" size={18} /></span>
                <span>Rendimiento en km/L calculado con tus cargas.</span>
              </li>
              <li>
                <span className="auth-panel-icono icono-ambar" aria-hidden="true"><Icon name="bell" size={18} /></span>
                <span>Avisos de servicio, seguro y verificación.</span>
              </li>
              <li>
                <span className="auth-panel-icono icono-cyan" aria-hidden="true"><Icon name="wifi-off" size={18} /></span>
                <span>Registra sin conexión; se sincroniza al volver la señal.</span>
              </li>
            </ul>
          </aside>

          <section className="auth-card" id="formulario-acceso" aria-labelledby="titulo-acceso" tabIndex={-1}>
            <div className="auth-marca-movil" aria-hidden="true">
              <span className="brand-mark brand-mark--sm">A</span>
              <span>Autiva</span>
            </div>
            <h1 id="titulo-acceso" className="auth-title">{titulo}</h1>
            {descripcion && <p className="auth-subtexto">{descripcion}</p>}
            {children}
          </section>
        </div>
      </main>
    </div>
  )
}
