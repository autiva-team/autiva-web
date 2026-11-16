import { useEffect, useRef } from 'react'

const CONTROLES = 'button.btn, button.accion-principal, button.secundario, .accion-card, .icon-button, .nav-item, .bottom-item'
const TARJETAS = '.tarjeta, .perfil-card, .perfil-bloque, .gastos-filtros, .accion-card'
const REVELAR = '.grafica-card, .estadisticas-perspectiva, .perfil-configuracion > .perfil-bloque, .estado-vacio'

// Spotlight Card / Click Spark / Fade Content: delegación única, sin bucles de render.
export default function EfectosInterfaz() {
  const capaRef = useRef(null)
  useEffect(() => {
    const capa = capaRef.current
    const preferencia = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const punteroFino = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    const iluminados = new Set()
    const vistos = new WeakSet()
    const observados = new Set()
    const animaciones = new Set()
    let frame = 0
    let ultimoEvento
    let desmontado = false
    let ultimaEstela = 0
    const halo = document.createElement('span')
    halo.className = 'cursor-halo'
    capa?.appendChild(halo)
    const reducir = () => Boolean(preferencia?.matches)
    const limpiarLuz = () => {
      halo.style.opacity = '0'
      for (const elemento of iluminados) elemento.removeAttribute('data-luz-activa')
      iluminados.clear()
    }
    const recordar = (animacion, alTerminar) => {
      animaciones.add(animacion)
      animacion.finished.then(() => { animaciones.delete(animacion); alTerminar?.() }, () => { animaciones.delete(animacion); alTerminar?.() })
    }
    const pintarLuz = () => {
      frame = 0
      if (desmontado || reducir() || !ultimoEvento) return
      const { target, clientX, clientY } = ultimoEvento
      halo.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`
      halo.style.opacity = target.closest('input, textarea, select, [contenteditable="true"]') ? '0' : '1'
      const ahora = performance.now()
      if (halo.style.opacity === '1' && ahora - ultimaEstela > 32 && capa?.animate) {
        ultimaEstela = ahora
        const gota = document.createElement('span')
        gota.className = 'cursor-estela'
        gota.style.left = `${clientX}px`
        gota.style.top = `${clientY}px`
        capa.appendChild(gota)
        recordar(gota.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: .6 },
          { transform: 'translate(-50%, -50%) scale(.15)', opacity: 0 },
        ], { duration: 550, easing: 'ease-out' }), () => gota.remove())
      }
      const candidatos = [target.closest(CONTROLES), target.closest(TARJETAS)].filter((e) => e && !e.disabled && !e.closest('[aria-busy="true"]'))
      const actuales = new Set(candidatos)
      for (const elemento of iluminados) if (!actuales.has(elemento)) { elemento.removeAttribute('data-luz-activa'); iluminados.delete(elemento) }
      for (const elemento of actuales) {
        const rect = elemento.getBoundingClientRect()
        elemento.style.setProperty('--luz-x', `${clientX - rect.left}px`)
        elemento.style.setProperty('--luz-y', `${clientY - rect.top}px`)
        elemento.setAttribute('data-luz-activa', '')
        iluminados.add(elemento)
      }
    }
    const mover = (evento) => {
      if (reducir() || evento.pointerType === 'touch' || punteroFino?.matches === false || !(evento.target instanceof Element)) return
      ultimoEvento = { target: evento.target, clientX: evento.clientX, clientY: evento.clientY }
      if (!frame) frame = requestAnimationFrame(pintarLuz)
    }
    const pulsar = (evento) => {
      if (reducir() || !capa || !(evento.target instanceof Element) || !capa.animate) return
      const boton = evento.target.closest(CONTROLES)
      if (!boton || boton.disabled || boton.getAttribute('aria-busy') === 'true' || evento.button > 0) return
      // Una onda pequeña y efímera, fuera del DOM controlado por los formularios.
      const onda = document.createElement('span')
      onda.className = 'interaccion-onda'
      onda.style.left = `${evento.clientX}px`
      onda.style.top = `${evento.clientY}px`
      capa.appendChild(onda)
      recordar(onda.animate([{ transform: 'translate(-50%, -50%) scale(.3)', opacity: .6 }, { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.2,.7,.3,1)' }), () => onda.remove())
      if (evento.pointerType === 'touch' || punteroFino?.matches === false) return
      for (let i = 0; i < 8; i++) {
        const angulo = (i / 8) * Math.PI * 2
        const chispa = document.createElement('span')
        chispa.className = 'cursor-chispa'
        chispa.style.left = `${evento.clientX}px`
        chispa.style.top = `${evento.clientY}px`
        capa.appendChild(chispa)
        recordar(chispa.animate([
          { transform: `rotate(${angulo}rad) translateX(8px) scaleX(1)`, opacity: 1 },
          { transform: `rotate(${angulo}rad) translateX(42px) scaleX(.2)`, opacity: 0 },
        ], { duration: 460, easing: 'cubic-bezier(.1,.6,.3,1)' }), () => chispa.remove())
      }
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        const elemento = entrada.target
        observer.unobserve(elemento)
        observados.delete(elemento)
        if (!reducir() && elemento.animate) recordar(elemento.animate([{ opacity: .65, translate: '0 7px' }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' }))
      }
    }, { threshold: .08 })
    const registrar = (nodo) => {
      if (!(nodo instanceof Element) || !observer || reducir()) return
      const candidatos = [...(nodo.matches(REVELAR) ? [nodo] : []), ...nodo.querySelectorAll(REVELAR)]
      for (const elemento of candidatos) if (!vistos.has(elemento)) { vistos.add(elemento); observados.add(elemento); observer.observe(elemento) }
    }
    registrar(document.getElementById('root'))
    const mutaciones = new MutationObserver((cambios) => {
      for (const cambio of cambios) for (const nodo of cambio.addedNodes) registrar(nodo)
      for (const elemento of observados) if (!elemento.isConnected) { observer?.unobserve(elemento); observados.delete(elemento) }
    })
    const raiz = document.getElementById('root')
    if (raiz) mutaciones.observe(raiz, { childList: true, subtree: true })
    const salir = (evento) => { if (!evento.relatedTarget) limpiarLuz() }
    const visibilidad = () => {
      document.documentElement.toggleAttribute('data-animaciones-pausadas', document.visibilityState === 'hidden')
      if (document.visibilityState === 'hidden') { limpiarLuz(); for (const animacion of animaciones) animacion.cancel() }
    }
    const cambiarPreferencia = () => {
      if (reducir()) { limpiarLuz(); observer?.disconnect(); for (const animacion of animaciones) animacion.cancel() }
    }
    document.addEventListener('pointermove', mover, { passive: true })
    document.addEventListener('pointerout', salir, { passive: true })
    document.addEventListener('pointerdown', pulsar, { passive: true })
    document.addEventListener('scroll', limpiarLuz, { passive: true, capture: true })
    document.addEventListener('visibilitychange', visibilidad)
    preferencia?.addEventListener?.('change', cambiarPreferencia)
    return () => {
      desmontado = true
      cancelAnimationFrame(frame)
      limpiarLuz()
      observer?.disconnect()
      mutaciones.disconnect()
      for (const animacion of animaciones) animacion.cancel()
      document.removeEventListener('pointermove', mover)
      document.removeEventListener('pointerout', salir)
      document.removeEventListener('pointerdown', pulsar)
      document.removeEventListener('scroll', limpiarLuz, true)
      document.removeEventListener('visibilitychange', visibilidad)
      preferencia?.removeEventListener?.('change', cambiarPreferencia)
      document.documentElement.removeAttribute('data-animaciones-pausadas')
      halo.remove()
    }
  }, [])
  return <div className="interacciones-capa" aria-hidden="true" ref={capaRef} />
}
