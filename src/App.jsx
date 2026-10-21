import { useState } from 'react'
import LoginPage from './features/auth/LoginPage.jsx'
import RegistroPage from './features/auth/RegistroPage.jsx'
import PrincipalPage from './features/home/PrincipalPage.jsx'
import './App.css'

const USUARIO_KEY = 'autiva_usuario'
const TOKEN_KEY = 'autiva_token'

function leerUsuario() {
  try {
    const raw = localStorage.getItem(USUARIO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const [usuario, setUsuario] = useState(() => leerUsuario())
  const [vista, setVista] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? 'principal' : 'login'
  )

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
    setUsuario(null)
    setVista('login')
  }

  if (vista === 'principal') {
    return <PrincipalPage usuario={usuario} onLogout={handleLogout} />
  }

  if (vista === 'registro') {
    return (
      <RegistroPage
        onIrALogin={() => setVista('login')}
      />
    )
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onIrARegistro={() => setVista('registro')}
    />
  )
}

export default App