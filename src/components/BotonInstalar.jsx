import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import './BotonInstalar.css'

export default function BotonInstalar() {
  const { instalada, puedeInstalar, mostrarInstruccionesIOS, instalar } =
    useInstallPrompt()
  const [verInstrucciones, setVerInstrucciones] = useState(false)

  if (instalada) return null
  if (!puedeInstalar && !mostrarInstruccionesIOS) return null

  if (mostrarInstruccionesIOS) {
    return (
      <div className="instalar">
        <button
          type="button"
          className="link"
          onClick={() => setVerInstrucciones((v) => !v)}
        >
          Instalar Autiva en tu iPhone
        </button>
        {verInstrucciones && (
          <p className="instalar-instrucciones">
            Toca <strong>Compartir</strong> y luego{' '}
            <strong>Agregar a pantalla de inicio</strong>.
          </p>
        )}
      </div>
    )
  }

  return (
    <button type="button" className="link instalar-boton" onClick={instalar}>
      Instalar Autiva
    </button>
  )
}
