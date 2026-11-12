import { createContext, useContext, useEffect, useState } from 'react'

const TEMA_KEY = 'autiva_tema'

const TemaContexto = createContext({
  tema: 'light',
  alternarTema: () => {},
})

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      const guardado = localStorage.getItem(TEMA_KEY)
      if (guardado === 'dark' || guardado === 'light') return guardado
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    } catch {
      // fallback
    }
    return 'light'
  })

  useEffect(() => {
    try {
      localStorage.setItem(TEMA_KEY, tema)
    } catch {
      // Ignora errores de localStorage
    }
    const root = document.documentElement
    if (tema === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }, [tema])

  const alternarTema = () => {
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <TemaContexto.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContexto.Provider>
  )
}

export function useTema() {
  return useContext(TemaContexto)
}
