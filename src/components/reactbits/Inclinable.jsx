import { useRef } from 'react'

/** Inclina su contenido en 3D siguiendo al puntero (solo con mouse y sin «reducir movimiento»). */
export default function Inclinable({ children, className = '', max = 8 }) {
  const ref = useRef(null)
  const permitido = () => window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const mover = (e) => {
    const el = ref.current
    if (!el || !permitido()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`
  }
  const salir = () => { if (ref.current) ref.current.style.transform = '' }

  return (
    <section ref={ref} className={className} onPointerMove={mover} onPointerLeave={salir} style={{ transition: 'transform 0.2s ease-out' }}>
      {children}
    </section>
  )
}
