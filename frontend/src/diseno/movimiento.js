/* Utilidades de movimiento compartidas por las piezas Bento. */
import { useEffect, useRef, useState } from 'react'

export const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** [ref, visto]: visto pasa a true cuando el elemento entra en pantalla (una sola vez). */
export function useEnVista(umbral = 0.25) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reducido() || !('IntersectionObserver' in window)) { setV(true); return undefined }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect() } }, { threshold: umbral, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [umbral])
  return [ref, v]
}
