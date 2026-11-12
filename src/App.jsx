import { useCallback, useEffect, useState } from 'react'
import {
  EVENTO_PENDIENTES,
  registrarSincronizacionAutomatica,
  sincronizarEnSegundoPlano,
} from './offline/syncQueue'
import LoginPage from './features/auth/LoginPage.jsx'
import RegistroPage from './features/auth/RegistroPage.jsx'
import RecuperarContrasenaPage from './features/auth/RecuperarContrasenaPage.jsx'
import PrincipalPage from './features/home/PrincipalPage.jsx'
import PlaceholderPage from './features/home/PlaceholderPage.jsx'
import PerfilPage from './features/perfil/PerfilPage.jsx'
import VehiculoRegistroPage from './features/vehiculos/VehiculoRegistroPage.jsx'
import VehiculosPage from './features/vehiculos/VehiculosPage.jsx'
import VehiculoDetallePage from './features/vehiculos/VehiculoDetallePage.jsx'
import CargasHistorialPage from './features/cargas/CargasHistorialPage.jsx'
import RegistrarCargaPage from './features/cargas/RegistrarCargaPage.jsx'
import ServiciosHistorialPage from './features/servicios/ServiciosHistorialPage.jsx'
import ServicioRegistroPage from './features/servicios/ServicioRegistroPage.jsx'
import RecordatoriosPage from './features/recordatorios/RecordatoriosPage.jsx'
import GastosPage from './features/gastos/GastosPage.jsx'
import EstadisticasPage from './features/estadisticas/EstadisticasPage.jsx'
import AppLayout from './app/AppLayout.jsx'
import { AvisoProvider, useAviso } from './components/Aviso'
import { TemaProvider } from './context/TemaContext'
import { usePush } from './push/usePush'
import { listarVehiculos, marcarVehiculoActivo, actualizarOdometro } from './features/vehiculos/vehiculosApi'
import { obtenerHome } from './features/home/homeApi'
import { cerrarSesion } from './features/auth/authApi'
import { mensajeError } from './utils/mensajes'
import './App.css'

const USUARIO_KEY = 'autiva_usuario'
const TOKEN_KEY = 'autiva_token'
const VEHICULOS_KEY = 'autiva_vehiculos'
const VEHICULOS_CACHE_KEY = 'autiva_vehiculos_cache'
const FOTOS_KEY = 'autiva_vehiculo_fotos'
const VEHICULO_LEGACY_KEY = 'autiva_vehiculo'

function leerUsuario() {
  try {
    const raw = localStorage.getItem(USUARIO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function leerVehiculos() {
  try {
    const raw = localStorage.getItem(VEHICULOS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    const legacy = localStorage.getItem(VEHICULO_LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      return parsed ? [parsed] : []
    }
    return []
  } catch {
    return []
  }
}

function leerFotos() {
  try {
    const raw = localStorage.getItem(FOTOS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function Aplicacion() {
  const { avisar } = useAviso()
  const [usuario, setUsuario] = useState(() => leerUsuario())
  const [vehiculos, setVehiculos] = useState(() => leerVehiculos())
  const [fotos, setFotos] = useState(() => leerFotos())
  const [vista, setVista] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? 'principal' : 'login'
  )
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [instalable, setInstalable] = useState(false)
  const [homeEstado, setHomeEstado] = useState(null)
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(null)
  const [volverCargaA, setVolverCargaA] = useState('gasolina')
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false)
  const push = usePush()

  const cargarVehiculos = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    setCargandoVehiculos(true)
    try {
      const datos = await listarVehiculos()
      const lista = Array.isArray(datos) ? datos : []
      setVehiculos(lista)
      localStorage.setItem(VEHICULOS_CACHE_KEY, JSON.stringify(lista))
      if (!vehiculoSeleccionadoId && lista.length > 0) {
        setVehiculoSeleccionadoId(lista.find((v) => v.esPrincipal)?.id || lista[0].id)
      }
    } catch {
      try {
        const cache = localStorage.getItem(VEHICULOS_CACHE_KEY)
        if (cache) setVehiculos(JSON.parse(cache))
      } catch {
        // Ignora errores de cache.
      }
    } finally {
      setCargandoVehiculos(false)
    }
  }, [vehiculoSeleccionadoId])

  const cargarHome = useCallback(async () => {
    try {
      const datos = await obtenerHome()
      setHomeEstado(datos)
    } catch {
      setHomeEstado(null)
    }
  }, [])

  useEffect(() => {
    registrarSincronizacionAutomatica()

    const onUnauthorized = () => {
      localStorage.removeItem(VEHICULOS_KEY)
      localStorage.removeItem(FOTOS_KEY)
      localStorage.removeItem(VEHICULOS_CACHE_KEY)
      localStorage.removeItem(VEHICULO_LEGACY_KEY)
      setUsuario(null)
      setVehiculos([])
      setFotos({})
      setVista('login')
    }

    window.addEventListener('autiva:unauthorized', onUnauthorized)

    if (localStorage.getItem(TOKEN_KEY)) {
      void (async () => {
        await cargarVehiculos().catch(() => {})
        await cargarHome().catch(() => {})
      })()
    }

    return () => window.removeEventListener('autiva:unauthorized', onUnauthorized)
  }, [cargarVehiculos, cargarHome])

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setInstalable(true)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setInstalable(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  // Al terminar de enviar la cola offline se avisa y se refrescan los datos.
  useEffect(() => {
    const onPendientes = (evento) => {
      const enviados = evento.detail?.sincronizados
      if (!enviados) return
      avisar(
        enviados === 1
          ? 'Se sincronizó 1 registro guardado sin conexión.'
          : `Se sincronizaron ${enviados} registros guardados sin conexión.`
      )
      void cargarVehiculos()
      void cargarHome()
    }
    window.addEventListener(EVENTO_PENDIENTES, onPendientes)
    return () => window.removeEventListener(EVENTO_PENDIENTES, onPendientes)
  }, [avisar, cargarVehiculos, cargarHome])

  // El resultado de activar notificaciones se comunica como aviso visible.
  useEffect(() => {
    if (!push.mensaje) return
    avisar(push.mensaje, push.error ? 'error' : 'exito')
    push.limpiar()
  }, [push, avisar])

  const navegar = (destino) => {
    setVista(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const instalarApp = async () => {
    if (!deferredPrompt) {
      avisar(
        'Tu navegador no permite la instalación automática. Usa la opción «Agregar a pantalla de inicio» del menú del navegador.',
        'info'
      )
      return
    }

    deferredPrompt.prompt()
    try {
      const resultado = await deferredPrompt.userChoice
      if (resultado.outcome === 'accepted') {
        setInstalable(false)
        setDeferredPrompt(null)
        avisar('Autiva quedó instalada en tu dispositivo.', 'exito')
      }
    } catch {
      // Ignora errores de cancelación del prompt.
    }
  }

  const handleLogin = (datos) => {
    localStorage.setItem(TOKEN_KEY, datos.token)
    const info = {
      id: datos.usuarioId,
      nombre: datos.nombre,
      correo: datos.correo,
      tipoCuenta: datos.tipoCuenta,
      expiraEn: datos.expiraEn,
    }
    localStorage.setItem(USUARIO_KEY, JSON.stringify(info))
    setUsuario(info)
    setVista('principal')
    cargarVehiculos()
    cargarHome()
    // Envía lo capturado sin conexión que quedó pendiente antes de iniciar sesión.
    sincronizarEnSegundoPlano()
  }

  const handleLogout = async () => {
    // POST /api/auth/logout mientras el token sigue disponible; si falla
    // (por ejemplo, sin conexión) la sesión local se cierra de todos modos.
    try {
      await cerrarSesion()
    } catch {
      // Ignora errores: el token se elimina del dispositivo a continuación.
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    localStorage.removeItem(VEHICULOS_KEY)
    localStorage.removeItem(VEHICULOS_CACHE_KEY)
    localStorage.removeItem(FOTOS_KEY)
    localStorage.removeItem(VEHICULO_LEGACY_KEY)
    setUsuario(null)
    setVehiculos([])
    setFotos({})
    setHomeEstado(null)
    setVehiculoSeleccionadoId(null)
    push.limpiar()
    setVista('login')
  }

  const handleVehiculoRegistrado = (datos) => {
    cargarVehiculos()
    avisar(`${datos.marca} ${datos.modelo} se agregó a tu expediente.`)
    navegar('vehiculos')
  }

  const handleMarcarActivo = async (id) => {
    try {
      await marcarVehiculoActivo(id)
      await cargarVehiculos()
      avisar('Vehículo marcado como principal.')
    } catch (error) {
      avisar(mensajeError(error, 'marcar el vehículo como principal'), 'error')
    }
  }

  const handleActualizarOdometro = async (id, odometro) => {
    try {
      await actualizarOdometro(id, odometro)
      await cargarVehiculos()
      avisar('Odómetro actualizado correctamente.')
    } catch (error) {
      avisar(mensajeError(error, 'actualizar el odómetro'), 'error')
    }
  }

  const irARegistrarCarga = (id, origen = 'gasolina') => {
    setVehiculoSeleccionadoId(id)
    setVolverCargaA(origen)
    navegar('registrarCarga')
  }

  const irARegistrarServicio = (id) => {
    setVehiculoSeleccionadoId(id)
    navegar('registrarServicio')
  }

  // Acciones del botón «Registrar»: llevan directo al formulario
  // usando el vehículo seleccionado o el principal.
  const handleAccionRapida = (tipo) => {
    if (tipo === 'recordatorio') {
      navegar('recordatorios')
      return
    }

    const id =
      vehiculoSeleccionadoId ||
      vehiculos.find((v) => v.esPrincipal)?.id ||
      vehiculos[0]?.id

    if (!id) {
      avisar('Primero registra un vehículo; después podrás agregar cargas y servicios.', 'info')
      navegar('registrarVehiculo')
      return
    }

    if (tipo === 'carga') {
      // Al guardar o cancelar se vuelve a la pantalla desde donde se abrió.
      const origen = ['principal', 'vehiculos', 'gasolina', 'vehiculoDetalle'].includes(vista) ? vista : 'gasolina'
      irARegistrarCarga(id, origen)
    } else if (tipo === 'servicio') {
      irARegistrarServicio(id)
    }
  }

  const handleCargaGuardada = (datos, _editando, pendiente) => {
    if (pendiente) {
      avisar('Sin conexión: la carga se guardó en tu dispositivo y se enviará al recuperar la conexión.', 'info')
    } else {
      void cargarVehiculos()
      avisar('Carga registrada correctamente.')
    }
    navegar(volverCargaA)
  }

  const handleServicioGuardado = (datos, _editando, pendiente) => {
    if (pendiente) {
      avisar('Sin conexión: el servicio se guardó en tu dispositivo y se enviará al recuperar la conexión.', 'info')
    } else {
      void cargarVehiculos()
      avisar('Servicio registrado correctamente.')
    }
    navegar('mantenimiento')
  }

  if (!usuario) {
    if (vista === 'registro') {
      return <RegistroPage onIrALogin={() => setVista('login')} />
    }

    if (vista === 'recuperar') {
      return <RecuperarContrasenaPage onVolver={() => setVista('login')} />
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onIrARegistro={() => setVista('registro')}
        onIrARecuperar={() => setVista('recuperar')}
      />
    )
  }

  const vistasConocidas = [
    'principal',
    'vehiculos',
    'vehiculoDetalle',
    'registrarVehiculo',
    'registrarCarga',
    'registrarServicio',
    'perfil',
    'gasolina',
    'mantenimiento',
    'gastos',
    'recordatorios',
    'estadisticas',
  ]
  const vistaActual = vistasConocidas.includes(vista) ? vista : 'principal'

  let contenido
  let vistaActiva = vistaActual

  if (vistaActual === 'principal') {
    contenido = (
      <PrincipalPage
        usuario={usuario}
        vehiculos={vehiculos}
        fotos={fotos}
        homeEstado={homeEstado}
        onNavegar={navegar}
        onRegistrarVehiculo={() => navegar('registrarVehiculo')}
        onActualizarOdometro={handleActualizarOdometro}
        instalable={instalable}
        onInstalar={instalarApp}
        onAccionRapida={handleAccionRapida}
      />
    )
  } else if (vistaActual === 'vehiculos') {
    contenido = (
      <VehiculosPage
        vehiculos={vehiculos}
        fotos={fotos}
        cargando={cargandoVehiculos}
        onRegistrarVehiculo={() => navegar('registrarVehiculo')}
        onVerDetalle={(id) => {
          setVehiculoSeleccionadoId(id)
          navegar('vehiculoDetalle')
        }}
        onMarcarActivo={handleMarcarActivo}
        onActualizarOdometro={handleActualizarOdometro}
        onRegistrarCarga={(id) => irARegistrarCarga(id, 'vehiculos')}
      />
    )
  } else if (vistaActual === 'vehiculoDetalle') {
    vistaActiva = 'vehiculos'
    contenido = (
      <VehiculoDetallePage
        vehiculoId={vehiculoSeleccionadoId}
        foto={vehiculoSeleccionadoId ? fotos[vehiculoSeleccionadoId] : ''}
        onVolver={() => navegar('vehiculos')}
        onMarcarActivo={handleMarcarActivo}
        onActualizarOdometro={handleActualizarOdometro}
        onRegistrarCarga={(id) => irARegistrarCarga(id, 'vehiculoDetalle')}
        onIrARecordatorios={(id) => {
          setVehiculoSeleccionadoId(id)
          navegar('recordatorios')
        }}
      />
    )
  } else if (vistaActual === 'registrarVehiculo') {
    vistaActiva = 'vehiculos'
    contenido = (
      <VehiculoRegistroPage
        onVolver={() => navegar('vehiculos')}
        onRegistrado={handleVehiculoRegistrado}
      />
    )
  } else if (vistaActual === 'registrarCarga') {
    vistaActiva = 'gasolina'
    contenido = (
      <RegistrarCargaPage
        key={`carga-${vehiculoSeleccionadoId || 'sin-vehiculo'}`}
        vehiculoId={vehiculoSeleccionadoId}
        onVolver={() => navegar(volverCargaA)}
        onGuardado={handleCargaGuardada}
      />
    )
  } else if (vistaActual === 'gasolina') {
    vistaActiva = 'gasolina'
    contenido = (
      <CargasHistorialPage
        vehiculos={vehiculos}
        vehiculoId={vehiculoSeleccionadoId}
        onSeleccionarVehiculo={setVehiculoSeleccionadoId}
        onRegistrarCarga={(id) => irARegistrarCarga(id, 'gasolina')}
      />
    )
  } else if (vistaActual === 'mantenimiento') {
    vistaActiva = 'mantenimiento'
    contenido = (
      <ServiciosHistorialPage
        vehiculos={vehiculos}
        vehiculoId={vehiculoSeleccionadoId}
        onSeleccionarVehiculo={setVehiculoSeleccionadoId}
        onRegistrarServicio={irARegistrarServicio}
      />
    )
  } else if (vistaActual === 'registrarServicio') {
    vistaActiva = 'mantenimiento'
    contenido = (
      <ServicioRegistroPage
        key={`servicio-${vehiculoSeleccionadoId || 'sin-vehiculo'}`}
        vehiculoId={vehiculoSeleccionadoId}
        onVolver={() => navegar('mantenimiento')}
        onGuardado={handleServicioGuardado}
      />
    )
  } else if (vistaActual === 'gastos') {
    contenido = <GastosPage onNavegar={navegar} />
  } else if (vistaActual === 'recordatorios') {
    contenido = (
      <RecordatoriosPage
        vehiculos={vehiculos}
        vehiculoId={vehiculoSeleccionadoId}
        onSeleccionarVehiculo={setVehiculoSeleccionadoId}
      />
    )
  } else if (vistaActual === 'estadisticas') {
    contenido = (
      <EstadisticasPage
        vehiculos={vehiculos}
        vehiculoId={vehiculoSeleccionadoId}
        onSeleccionarVehiculo={setVehiculoSeleccionadoId}
      />
    )
  } else if (vistaActual === 'perfil') {
    contenido = (
      <PerfilPage
        usuario={usuario}
        onLogout={handleLogout}
        push={push}
      />
    )
  } else {
    contenido = (
      <PlaceholderPage
        seccion={vistaActual}
        onInicio={() => navegar('principal')}
      />
    )
  }

  return (
    <AppLayout
      usuario={usuario}
      vista={vistaActual}
      vistaActiva={vistaActiva}
      onNavegar={navegar}
      onAccionRapida={handleAccionRapida}
      push={push}
    >
      {contenido}
    </AppLayout>
  )
}

function App() {
  return (
    <TemaProvider>
      <AvisoProvider>
        <Aplicacion />
      </AvisoProvider>
    </TemaProvider>
  )
}

export default App
