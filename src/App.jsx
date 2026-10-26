import { useEffect, useState } from 'react'
import { registrarSincronizacionAutomatica } from './offline/syncQueue'
import LoginPage from './features/auth/LoginPage.jsx'
import RegistroPage from './features/auth/RegistroPage.jsx'
import PrincipalPage from './features/home/PrincipalPage.jsx'
import PlaceholderPage from './features/home/PlaceholderPage.jsx'
import PerfilPage from './features/perfil/PerfilPage.jsx'
import VehiculoRegistroPage from './features/vehiculos/VehiculoRegistroPage.jsx'
import VehiculosPage from './features/vehiculos/VehiculosPage.jsx'
import AppLayout from './app/AppLayout.jsx'
import { usePush } from './push/usePush'
import './App.css'

const USUARIO_KEY = 'autiva_usuario'
const TOKEN_KEY = 'autiva_token'
const VEHICULOS_KEY = 'autiva_vehiculos'
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

function App() {
  const [usuario, setUsuario] = useState(() => leerUsuario())
  const [vehiculos, setVehiculos] = useState(() => leerVehiculos())
  const [fotos, setFotos] = useState(() => leerFotos())
  const [vista, setVista] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? 'principal' : 'login'
  )
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [instalable, setInstalable] = useState(false)
  const push = usePush()

  useEffect(() => {
    registrarSincronizacionAutomatica()

    const onUnauthorized = () => {
      localStorage.removeItem(VEHICULOS_KEY)
      localStorage.removeItem(FOTOS_KEY)
      localStorage.removeItem(VEHICULO_LEGACY_KEY)
      setUsuario(null)
      setVehiculos([])
      setFotos({})
      setVista('login')
    }

    window.addEventListener('autiva:unauthorized', onUnauthorized)
    return () => window.removeEventListener('autiva:unauthorized', onUnauthorized)
  }, [])

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

  const navegar = (destino) => {
    setVista(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const instalarApp = async () => {
    if (!deferredPrompt) {
      window.alert(
        'Tu navegador no permite la instalación automática. Usa la opción "Agregar a pantalla de inicio" del menú del navegador.'
      )
      return
    }

    deferredPrompt.prompt()
    try {
      const resultado = await deferredPrompt.userChoice
      if (resultado.outcome === 'accepted') {
        setInstalable(false)
        setDeferredPrompt(null)
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
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    localStorage.removeItem(VEHICULOS_KEY)
    localStorage.removeItem(FOTOS_KEY)
    localStorage.removeItem(VEHICULO_LEGACY_KEY)
    setUsuario(null)
    setVehiculos([])
    setFotos({})
    push.limpiar()
    setVista('login')
  }

  const handleVehiculoRegistrado = (datos, foto) => {
    const nuevaLista = [...vehiculos, datos]
    localStorage.setItem(VEHICULOS_KEY, JSON.stringify(nuevaLista))
    setVehiculos(nuevaLista)

    if (foto) {
      const nuevasFotos = { ...fotos, [datos.id]: foto }
      localStorage.setItem(FOTOS_KEY, JSON.stringify(nuevasFotos))
      setFotos(nuevasFotos)
    }

    navegar('vehiculos')
  }

  if (!usuario) {
    if (vista === 'registro') {
      return <RegistroPage onIrALogin={() => setVista('login')} />
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onIrARegistro={() => setVista('registro')}
      />
    )
  }

  const vistasConocidas = [
    'principal',
    'vehiculos',
    'registrarVehiculo',
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
        onNavegar={navegar}
        onRegistrarVehiculo={() => navegar('registrarVehiculo')}
        instalable={instalable}
        onInstalar={instalarApp}
      />
    )
  } else if (vistaActual === 'vehiculos') {
    contenido = (
      <VehiculosPage
        vehiculos={vehiculos}
        fotos={fotos}
        onRegistrarVehiculo={() => navegar('registrarVehiculo')}
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
  } else if (vistaActual === 'perfil') {
    contenido = (
      <PerfilPage
        usuario={usuario}
        onLogout={handleLogout}
        onActivarPush={push.activar}
        pushCargando={push.cargando}
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
      vistaActiva={vistaActiva}
      onNavegar={navegar}
      onNotificaciones={push.activar}
      pushCargando={push.cargando}
      pushMensaje={push.mensaje}
      pushError={push.error}
      onCerrarMensaje={push.limpiar}
    >
      {contenido}
    </AppLayout>
  )
}

export default App
