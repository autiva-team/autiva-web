import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icons'
import ConnectionBadge from '../components/ConnectionBadge'
import { barraVisible } from './barraInferior'
import Modal from '../components/Modal'
import BandejaNotificaciones from '../components/BandejaNotificaciones'
import FondoDinamico from '../components/FondoDinamico'
import { obtenerNotificaciones } from '../push/suscripcion'
import { useTema } from '../context/TemaContext'
import './AppLayout.css'

/* Arquitectura de información orientada a tareas del usuario:
   1. Ver el estado general   → Inicio, Mis vehículos
   2. Registrar lo que pasó   → Combustible, Mantenimiento, Gastos
   3. Planear y entender      → Recordatorios, Estadísticas
   La cuenta (Perfil) vive al pie, separada del trabajo diario. */
const GRUPOS = [
  {
    id: 'general',
    titulo: null,
    items: [
      { id: 'principal', label: 'Inicio', icon: 'home' },
      { id: 'vehiculos', label: 'Mis vehículos', icon: 'car' },
    ],
  },
  {
    id: 'bitacora',
    titulo: 'Bitácora',
    items: [
      { id: 'gasolina', label: 'Combustible', icon: 'fuel' },
      { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
      { id: 'gastos', label: 'Gastos', icon: 'wallet', proximamente: true },
    ],
  },
  {
    id: 'planear',
    titulo: 'Planear y analizar',
    items: [
      { id: 'recordatorios', label: 'Recordatorios', icon: 'bell' },
      { id: 'estadisticas', label: 'Estadísticas', icon: 'chart', proximamente: true },
    ],
  },
]

const TITULOS = {
  principal: 'Inicio',
  vehiculos: 'Mis vehículos',
  gasolina: 'Combustible',
  mantenimiento: 'Mantenimiento',
  gastos: 'Gastos',
  recordatorios: 'Recordatorios',
  estadisticas: 'Estadísticas',
  perfil: 'Perfil',
}

/* Acciones rápidas: las tareas más frecuentes a un toque desde cualquier pantalla. */
const ACCIONES_RAPIDAS = [
  { id: 'carga', label: 'Carga de combustible', detalle: 'Litros, costo y odómetro', icon: 'fuel' },
  { id: 'servicio', label: 'Servicio de mantenimiento', detalle: 'Taller, costo y próximo servicio', icon: 'wrench' },
  { id: 'gasto', label: 'Gasto', detalle: 'Seguro, verificación, tenencia y más', icon: 'wallet', proximamente: true },
  { id: 'recordatorio', label: 'Recordatorio', detalle: 'Por fecha o por kilometraje', icon: 'bell' },
]

/* En móvil la barra inferior muestra lo más frecuente; el resto está en «Más». */
const NAV_MOVIL = [
  { id: 'principal', label: 'Inicio', icon: 'home' },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car' },
  { id: 'registrar', label: 'Registrar', icon: 'plus', principal: true },
  { id: 'recordatorios', label: 'Recordatorios', icon: 'bell' },
  { id: 'mas', label: 'Más', icon: 'menu' },
]

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export default function AppLayout({
  usuario,
  vista,
  vistaActiva = 'principal',
  onNavegar,
  onAccionRapida,
  push,
  children,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [registrarAbierto, setRegistrarAbierto] = useState(false)
  const [bandejaAbierta, setBandejaAbierta] = useState(false)
  // La barra inferior se oculta al leer hacia abajo para no tapar contenido.
  const [barraInferiorVisible, setBarraInferiorVisible] = useState(true)

  useEffect(() => {
    let anterior = window.scrollY
    let visible = true
    let pendiente = false
    const alDesplazar = () => {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(() => {
        pendiente = false
        const actual = window.scrollY
        const siguiente = barraVisible({
          anterior,
          actual,
          alturaVista: window.innerHeight,
          alturaTotal: document.documentElement.scrollHeight,
          visible,
        })
        anterior = actual
        if (siguiente !== visible) {
          visible = siguiente
          setBarraInferiorVisible(siguiente)
        }
      })
    }
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])
  // Barra lateral colapsable en escritorio (se recuerda en el dispositivo).
  const [colapsado, setColapsado] = useState(() => {
    try {
      return localStorage.getItem('autiva_menu_colapsado') === '1'
    } catch {
      return false
    }
  })

  const alternarColapsado = () => {
    setColapsado((actual) => {
      const nuevo = !actual
      try {
        localStorage.setItem('autiva_menu_colapsado', nuevo ? '1' : '0')
      } catch {
        // Preferencia no persistente: no afecta el funcionamiento.
      }
      return nuevo
    })
  }

  // El botón hamburguesa abre el cajón en móvil y colapsa la barra en escritorio.
  const onHamburguesa = () => {
    const escritorio = window.matchMedia?.('(min-width: 1024px)').matches
    if (escritorio) alternarColapsado()
    else setMenuAbierto(true)
  }
  const [sinLeer, setSinLeer] = useState(0)
  const actualizarSinLeer = useCallback((total) => setSinLeer(total), [])

  // Contador de notificaciones sin leer (GET /api/push/notificaciones).
  useEffect(() => {
    let vigente = true
    obtenerNotificaciones()
      .then((datos) => {
        if (vigente && Array.isArray(datos)) setSinLeer(datos.filter((n) => !n.leida).length)
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [])

  const abrirBandeja = () => {
    setMenuAbierto(false)
    setBandejaAbierta(true)
  }
  const { tema, alternarTema } = useTema()
  const titulo = TITULOS[vistaActiva] || 'Inicio'
  const mainRef = useRef(null)
  const menuRef = useRef(null)
  const botonMenuRef = useRef(null)
  const vistaAnterior = useRef(null)

  // Al cambiar de pantalla: título del documento y foco al contenido,
  // para que lectores de pantalla y teclado empiecen desde arriba.
  // Solo se mueve el foco cuando la vista realmente cambió.
  useEffect(() => {
    document.title = `${titulo} · Autiva`
    const anterior = vistaAnterior.current
    vistaAnterior.current = vista
    if (anterior === null || anterior === vista) return
    mainRef.current?.focus({ preventScroll: true })
  }, [vista, titulo])

  // Menú móvil: Escape lo cierra y el foco entra y regresa correctamente.
  useEffect(() => {
    if (!menuAbierto) return undefined
    const boton = botonMenuRef.current
    menuRef.current?.querySelector('button')?.focus()
    const onTecla = (evento) => {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('keydown', onTecla)
    return () => {
      document.removeEventListener('keydown', onTecla)
      boton?.focus()
    }
  }, [menuAbierto])

  const navegarYCerrar = (id) => {
    onNavegar(id)
    setMenuAbierto(false)
  }

  const elegirAccion = (id) => {
    setRegistrarAbierto(false)
    setMenuAbierto(false)
    onAccionRapida?.(id)
  }

  const renderNav = (enCajon = false) => (
    <nav className="sidebar-nav" aria-label="Navegación principal">
      {GRUPOS.map((grupo) => (
        <div key={grupo.id} className="nav-grupo" role="group" aria-labelledby={grupo.titulo ? `nav-${grupo.id}${enCajon ? '-m' : ''}` : undefined}>
          {grupo.titulo && (
            <p className="nav-grupo-titulo" id={`nav-${grupo.id}${enCajon ? '-m' : ''}`}>
              {grupo.titulo}
            </p>
          )}
          <ul>
            {grupo.items.map((item) => {
              const activo = vistaActiva === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={activo ? 'nav-item activo' : 'nav-item'}
                    onClick={() => navegarYCerrar(item.id)}
                    aria-current={activo ? 'page' : undefined}
                    title={!enCajon && colapsado ? item.label + (item.proximamente ? ' (próximamente)' : '') : undefined}
                  >
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                    {item.proximamente && <span className="nav-proximamente">Próximamente</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const renderPie = () => (
    <div className="sidebar-footer">
      <button
        type="button"
        className={vistaActiva === 'perfil' ? 'sidebar-user activo' : 'sidebar-user'}
        onClick={() => navegarYCerrar('perfil')}
        aria-current={vistaActiva === 'perfil' ? 'page' : undefined}
      >
        <span className="avatar avatar-sm" aria-hidden="true">{iniciales(usuario?.nombre)}</span>
        {colapsado && <span className="sr-only">Perfil de {usuario?.nombre || 'usuario'}</span>}
        <span className="sidebar-user-datos">
          <strong>{usuario?.nombre || 'Usuario'}</strong>
          <span>Perfil y preferencias</span>
        </span>
        <Icon name="chevron-derecha" size={16} />
      </button>
    </div>
  )

  return (
    <div className={colapsado ? 'app-layout app-layout--colapsado' : 'app-layout'}>
      <FondoDinamico variante="suave" />
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>

      {/* Barra lateral flotante (escritorio) */}
      <aside className="sidebar" id="menu-lateral" aria-label="Menú de Autiva">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <strong>Autiva</strong>
            <span>Expediente vehicular</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primario btn--bloque sidebar-registrar"
          onClick={() => setRegistrarAbierto(true)}
          aria-label={colapsado ? 'Registrar' : undefined}
          title={colapsado ? 'Registrar' : undefined}
        >
          <Icon name="plus" size={20} />
          <span className="sidebar-texto">Registrar</span>
        </button>

        {renderNav()}
        {renderPie()}
      </aside>

      {/* Cajón de navegación (móvil y tableta) */}
      {menuAbierto && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
          <div
            ref={menuRef}
            className="cajon"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            id="menu-movil"
          >
            <div className="sidebar-brand">
              <span className="brand-mark" aria-hidden="true">A</span>
              <div>
                <strong>Autiva</strong>
                <span>Expediente vehicular</span>
              </div>
              <button
                type="button"
                className="icon-button cajon-cerrar"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {renderNav(true)}
            <div className="cajon-preferencias">
              <button type="button" className="nav-item" onClick={alternarTema}>
                <Icon name={tema === 'dark' ? 'sol' : 'luna'} size={20} />
                <span>{tema === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}</span>
              </button>
              <button type="button" className="nav-item" onClick={abrirBandeja}>
                <Icon name="bell" size={20} />
                <span>Notificaciones</span>
                {sinLeer > 0 && <span className="nav-proximamente">{sinLeer} sin leer</span>}
              </button>
            </div>
            {renderPie()}
          </div>
        </>
      )}

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={botonMenuRef}
              type="button"
              className="icon-button hamburger-btn"
              onClick={onHamburguesa}
              aria-label="Menú de navegación"
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
            >
              <span className={menuAbierto ? 'hamburguesa abierta' : 'hamburguesa'} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            <button
              type="button"
              className="icon-button hamburger-escritorio"
              onClick={alternarColapsado}
              aria-label={colapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'}
              aria-expanded={!colapsado}
              aria-controls="menu-lateral"
              title={colapsado ? 'Expandir menú' : 'Contraer menú'}
            >
              <span className={colapsado ? 'hamburguesa' : 'hamburguesa abierta-lateral'} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            <span className="topbar-marca" aria-hidden="true">
              <span className="brand-mark brand-mark--sm">A</span>
            </span>
            <p className="topbar-seccion">
              <span className="sr-only">Sección actual: </span>
              {titulo}
            </p>
          </div>
          <div className="topbar-actions">
            <ConnectionBadge />
            <button
              type="button"
              className="icon-button solo-escritorio"
              onClick={alternarTema}
              aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              <Icon name={tema === 'dark' ? 'sol' : 'luna'} size={20} />
            </button>
            <button
              type="button"
              className="icon-button campana"
              onClick={abrirBandeja}
              aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
              title="Notificaciones"
              aria-haspopup="dialog"
            >
              <Icon name="bell" size={20} />
              {sinLeer > 0 && (
                <span className="campana-contador" aria-hidden="true">
                  {sinLeer > 9 ? '9+' : sinLeer}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="app-body" id="contenido-principal" ref={mainRef} tabIndex={-1}>
          {children}
        </main>

        {/* Navegación inferior (móvil y tableta) */}
        <nav
          className={barraInferiorVisible ? 'bottom-nav' : 'bottom-nav bottom-nav--oculta'}
          aria-label="Navegación rápida"
        >
          <ul>
            {NAV_MOVIL.map((item) => {
              const activo = vistaActiva === item.id
              const onClick =
                item.id === 'registrar'
                  ? () => setRegistrarAbierto(true)
                  : item.id === 'mas'
                    ? () => setMenuAbierto(true)
                    : () => onNavegar(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={[
                      'bottom-item',
                      activo ? 'activo' : '',
                      item.principal ? 'bottom-item--principal' : '',
                    ].join(' ').trim()}
                    onClick={onClick}
                    aria-current={activo ? 'page' : undefined}
                    aria-haspopup={item.id === 'registrar' || item.id === 'mas' ? 'dialog' : undefined}
                  >
                    <span className="bottom-icono">
                      <Icon name={item.icon} size={item.principal ? 24 : 22} />
                    </span>
                    <span className="bottom-texto">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {registrarAbierto && (
        <Modal titulo="¿Qué quieres registrar?" onCerrar={() => setRegistrarAbierto(false)}>
          <ul className="acciones-rapidas">
            {ACCIONES_RAPIDAS.map((accion) => (
              <li key={accion.id}>
                <button
                  type="button"
                  className="accion-rapida"
                  onClick={() => elegirAccion(accion.id)}
                  disabled={accion.proximamente}
                  aria-describedby={accion.proximamente ? 'nota-proximamente' : undefined}
                >
                  <span className="icono-tono tono-azul" aria-hidden="true">
                    <Icon name={accion.icon} size={22} />
                  </span>
                  <span className="accion-rapida-texto">
                    <strong>{accion.label}</strong>
                    <span>{accion.detalle}</span>
                  </span>
                  {accion.proximamente ? (
                    <span className="nav-proximamente">Próximamente</span>
                  ) : (
                    <Icon name="chevron-derecha" size={18} />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p id="nota-proximamente" className="sr-only">Esta opción estará disponible próximamente.</p>
        </Modal>
      )}

      {bandejaAbierta && push && (
        <BandejaNotificaciones
          push={push}
          onCerrar={() => setBandejaAbierta(false)}
          onCambioSinLeer={actualizarSinLeer}
        />
      )}
    </div>
  )
}
