/* Tema día / noche — UN solo estado para toda la app (store de módulo + useSyncExternalStore).
   Primera visita: sigue al sistema (prefers-color-scheme). Después recuerda la elección.
   El cambio se revela en círculo desde el interruptor (View Transitions); sin soporte o con
   movimiento reducido, cambia de inmediato. Cualquier componente (p. ej. un mapa) que llame
   a useTema() se entera del cambio. */
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { reducido } from './movimiento.js'

const CLAVE = 'coipo-tema'
const subs = new Set()
let actual = null

export function temaInicial() {
  const g = localStorage.getItem(CLAVE)
  if (g === 'dia' || g === 'noche') return g
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'dia' : 'noche'
}

/* Se aplica antes del primer pintado (main.jsx) para que no parpadee. */
export function aplicarTema(t = temaInicial()) { actual = t; document.documentElement.dataset.tema = t }

const leer = () => actual ?? (actual = document.documentElement.dataset.tema || temaInicial())
function fijar(t) {
  aplicarTema(t)
  localStorage.setItem(CLAVE, t)
  subs.forEach((f) => f())
}

export function useTema() {
  const tema = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, leer)
  const alternar = (e) => {
    const sig = leer() === 'noche' ? 'dia' : 'noche'
    if (e?.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect()
      document.documentElement.style.setProperty('--vx', `${r.left + r.width / 2}px`)
      document.documentElement.style.setProperty('--vy', `${r.top + r.height / 2}px`)
    }
    if (!document.startViewTransition || reducido()) { fijar(sig); return }
    document.startViewTransition(() => flushSync(() => fijar(sig)))
  }
  return [tema, alternar]
}
