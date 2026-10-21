/* Ventana flotante que se mueve libremente dentro de su contenedor (p. ej. un panel sobre el mapa).
   Se arrastra desde el asa (mouse, dedo o lápiz) o con las flechas del teclado cuando el asa tiene foco
   (Mayús = pasos de 40 px). Doble clic en el asa la devuelve a su lugar. La posición se recuerda por
   `clave` (localStorage) y se mantiene dentro del contenedor si este cambia de tamaño.
   Uso:  const { ref, asa } = useArrastre('mapa-panel');  <div ref={ref}><div {...asa} /> …</div> */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useArrastre(clave) {
  const ref = useRef(null)
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`coipo-arrastre-${clave}`)) } catch { return null }
  })
  const inicio = useRef(null)

  const limitar = useCallback((x, y) => {
    const el = ref.current, padre = el?.offsetParent
    if (!el || !padre) return { x, y }
    const m = 8
    return {
      x: Math.min(Math.max(x, m), Math.max(m, padre.clientWidth - el.offsetWidth - m)),
      y: Math.min(Math.max(y, m), Math.max(m, padre.clientHeight - el.offsetHeight - m)),
    }
  }, [])

  // aplicar la posición: con `left/top` explícitos se anulan los anclajes del CSS
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!pos) { el.style.left = el.style.top = el.style.right = el.style.bottom = ''; delete el.dataset.movido; return }
    const p = limitar(pos.x, pos.y)
    Object.assign(el.style, { left: `${p.x}px`, top: `${p.y}px`, right: 'auto', bottom: 'auto' })
    el.dataset.movido = ''
  }, [pos, limitar])

  useEffect(() => {
    if (pos) localStorage.setItem(`coipo-arrastre-${clave}`, JSON.stringify(pos))
    else localStorage.removeItem(`coipo-arrastre-${clave}`)
  }, [pos, clave])

  // si el contenedor cambia de tamaño, la ventana no queda fuera de la vista
  useEffect(() => {
    const padre = ref.current?.offsetParent
    if (!padre) return undefined
    const ro = new ResizeObserver(() => setPos((p) => (p ? limitar(p.x, p.y) : p)))
    ro.observe(padre)
    return () => ro.disconnect()
  }, [limitar])

  const actual = () => {
    const el = ref.current
    return { x: el.offsetLeft, y: el.offsetTop }
  }

  const asa = {
    className: 'b-asa',
    role: 'button',
    tabIndex: 0,
    title: 'Arrastra para mover · doble clic para volver',
    'aria-label': 'Mover ventana. Usa las flechas; doble clic o Inicio la devuelve a su lugar.',
    onPointerDown: (e) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      inicio.current = { px: e.clientX, py: e.clientY, ...actual() }
      ref.current.dataset.arrastrando = ''
    },
    onPointerMove: (e) => {
      const s = inicio.current
      if (!s) return
      setPos(limitar(s.x + e.clientX - s.px, s.y + e.clientY - s.py))
    },
    onPointerUp: (e) => {
      inicio.current = null
      delete ref.current?.dataset.arrastrando
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    },
    onDoubleClick: () => setPos(null),
    onKeyDown: (e) => {
      const d = e.shiftKey ? 40 : 10
      const mov = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]
      if (e.key === 'Home') { e.preventDefault(); setPos(null); return }
      if (!mov) return
      e.preventDefault()
      const a = actual()
      setPos(limitar(a.x + mov[0], a.y + mov[1]))
    },
  }
  return { ref, asa, movido: !!pos, reiniciar: () => setPos(null) }
}
