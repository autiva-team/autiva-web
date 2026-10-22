import { useCallback, useEffect, useState } from 'react'

function detectarIOS() {
  const ua = window.navigator.userAgent
  const esIOS = /iphone|ipad|ipod/i.test(ua)
  const esSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
  return esIOS && esSafari
}

function detectarInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// Hook para la HU-003: expone cuándo se puede ofrecer instalar Autiva
// (Android/desktop vía beforeinstallprompt, o instrucciones manuales en iOS).
export function useInstallPrompt() {
  const [eventoDiferido, setEventoDiferido] = useState(null)
  const [instalada, setInstalada] = useState(() => detectarInstalada())

  useEffect(() => {
    if (instalada) return

    const onBeforeInstallPrompt = (evento) => {
      evento.preventDefault()
      setEventoDiferido(evento)
    }

    const onAppInstalled = () => {
      setInstalada(true)
      setEventoDiferido(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [instalada])

  const instalar = useCallback(async () => {
    if (!eventoDiferido) return
    await eventoDiferido.prompt()
    const resultado = await eventoDiferido.userChoice
    if (resultado.outcome === 'accepted') {
      setInstalada(true)
    }
    setEventoDiferido(null)
  }, [eventoDiferido])

  return {
    instalada,
    puedeInstalar: Boolean(eventoDiferido),
    mostrarInstruccionesIOS: !instalada && !eventoDiferido && detectarIOS(),
    instalar,
  }
}
