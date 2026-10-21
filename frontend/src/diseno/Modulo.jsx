import { useEnVista } from './movimiento.js'

/* Módulo Bento: entra con desenfoque al aparecer y una luz sigue al puntero (solo mouse).
   `children` puede ser función (visto) => nodo, para animar el contenido al entrar. */
export default function Modulo({ className = '', children, retraso = 0, ...resto }) {
  const [ref, v] = useEnVista()
  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <article ref={ref} className={`b-mod ${className}`} data-visto={v || undefined}
      style={{ '--retraso': `${retraso}ms` }} onPointerMove={mover} {...resto}>
      {typeof children === 'function' ? children(v) : children}
    </article>
  )
}
