import { lazy, Suspense, useEffect, useState } from 'react'

const SplashCursor = lazy(() => import('./SplashCursor.jsx'))

function permitido() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Cursor de salpicaduras: solo con puntero de precisión y sin «reducir movimiento». */
export default function EfectoCursor() {
  const [activo, setActivo] = useState(permitido)

  useEffect(() => {
    const consultas = [window.matchMedia('(pointer: fine)'), window.matchMedia('(prefers-reduced-motion: reduce)')]
    const actualizar = () => setActivo(permitido())
    consultas.forEach((c) => c.addEventListener('change', actualizar))
    return () => consultas.forEach((c) => c.removeEventListener('change', actualizar))
  }, [])

  if (!activo) return null
  return (
    <Suspense fallback={null}>
      <SplashCursor quality="medium" intensity={0.8} rainbow={false} colors={['#2563eb', '#0ea5e9', '#10b981']} />
    </Suspense>
  )
}
