import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { recargarAlActualizar } from './pwa/actualizacion'

// Cuando se publica una versión nueva, el service worker la activa y la
// página se recarga una vez para mostrarla (sin esperar a cerrar pestañas).
recargarAlActualizar()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
