/* Navegación — la barra de secciones bajo el banner. Ver `Navegacion.css`.
 *
 * No trae router: recibe `actual` y un `alCambiar` (o enlaces con href), así sirve
 * igual con React Router, con estado local o con páginas aparte. La sección actual
 * se marca con `aria-current="page"`, que es lo que el lector anuncia.
 *
 * El indicador es UN solo elemento que recorre la barra recortado con `clip-path`:
 * al cambiar de sección se desliza desde la anterior en vez de apagarse en una y
 * encenderse en otra, y como es una transición (no keyframes) un segundo clic a
 * mitad de camino la redirige sin saltar. Sin JavaScript, o antes de medir, la
 * sección actual igual se distingue por color y peso.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import './Navegacion.css'

/**
 * @param {object} props
 * @param {{id: string, texto: string, href?: string}[]} props.secciones
 * @param {string} props.actual
 * @param {(id: string) => void} [props.alCambiar]
 * @param {string} [props.nombre]  nombre del landmark si hay más de un <nav>
 */
export default function Navegacion({ secciones, actual, alCambiar, nombre = 'Secciones' }) {
  const lista = useRef(null)
  const indicador = useRef(null)
  const [listo, setListo] = useState(false)

  useLayoutEffect(() => {
    const ul = lista.current
    const barra = indicador.current
    if (!ul || !barra) return undefined
    const medir = () => {
      const activo = ul.querySelector('[aria-current="page"]')
      if (!activo) { barra.style.opacity = '0'; return }
      const ancho = ul.scrollWidth
      const desde = activo.offsetLeft + 12
      const hasta = ancho - (activo.offsetLeft + activo.offsetWidth - 12)
      barra.style.width = `${ancho}px`
      barra.style.opacity = '1'
      barra.style.clipPath = `inset(0 ${hasta}px 0 ${desde}px round 3px 3px 0 0)`
      // En pantallas angostas la barra se desplaza de lado: la sección actual siempre queda a la vista.
      const izq = activo.offsetLeft - 12, der = activo.offsetLeft + activo.offsetWidth + 12
      if (izq < ul.scrollLeft || der > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: Math.max(0, der - ul.clientWidth), behavior: 'instant' })
    }
    medir()
    setListo(true)
    const ro = new ResizeObserver(medir)
    ro.observe(ul)
    return () => ro.disconnect()
  }, [actual, secciones])

  return (
    <nav className="navegacion" aria-label={nombre}>
      <ul className="navegacion-lista" ref={lista} data-listo={listo || undefined}>
        {secciones.map((s) => (
          <li key={s.id}>
            <a
              className="navegacion-enlace"
              href={s.href ?? `#${s.id}`}
              aria-current={s.id === actual ? 'page' : undefined}
              onClick={alCambiar ? (e) => { e.preventDefault(); alCambiar(s.id) } : undefined}
            >
              {s.texto}
            </a>
          </li>
        ))}
        <li className="navegacion-indicador" ref={indicador} aria-hidden="true" />
      </ul>
    </nav>
  )
}
