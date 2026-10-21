/* Aviso — mensaje en línea o flotante («se guardó», «no se pudo enviar»). Ver `Aviso.css`.
 *
 * El tipo decide cómo lo anuncia el lector: un error interrumpe (`role="alert"`),
 * lo demás espera a que termine de hablar (`role="status"`). Un aviso de error NO
 * se cierra solo: quien lee despacio o usa lector puede perderlo (WCAG 2.2.1).
 *
 * Al cerrar, el aviso sale (160 ms) ANTES de que la vista lo quite: desaparecer de
 * golpe se siente roto. La salida es más corta que la entrada: entra para que se
 * note, sale porque ya se leyó. El temporizador de cierre se pausa mientras la
 * pestaña está oculta: nadie leyó un aviso que se cerró en otra pestaña.
 *
 * Los íconos son SVG dibujados con un mismo trazo (1.75, puntas redondas), no
 * caracteres Unicode: un «⚠» cambia de forma y de grosor según la fuente del equipo.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import './Aviso.css'

const SALIDA_MS = 160

const TRAZOS = {
  exito: <path d="M7.5 12.5l3 3 6-6.5" />,
  info: <><path d="M12 11v5.5" /><path d="M12 7.6v.1" /></>,
  aviso: <><path d="M12 7.5v5.5" /><path d="M12 16.4v.1" /></>,
  error: <><path d="M12 7.5v5.5" /><path d="M12 16.4v.1" /></>,
}

function Icono({ tipo }) {
  return (
    <svg className="aviso-icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {tipo === 'aviso'
        ? <path className="aviso-icono-forma" d="M10.3 4.2a2 2 0 0 1 3.4 0l7.4 12.6A2 2 0 0 1 19.4 20H4.6a2 2 0 0 1-1.7-3.2z" />
        : <circle className="aviso-icono-forma" cx="12" cy="12" r="9" />}
      {TRAZOS[tipo]}
    </svg>
  )
}

/**
 * @param {object} props
 * @param {'exito'|'info'|'aviso'|'error'} [props.tipo]
 * @param {string} [props.titulo]
 * @param {boolean} [props.flotante]   esquina inferior, sobre el contenido
 * @param {() => void} [props.alCerrar]  si existe, muestra la ×
 * @param {number} [props.duracion]    ms para cerrarse solo; se ignora si es error
 */
export default function Aviso({ tipo = 'info', titulo, flotante = false, alCerrar, duracion, children }) {
  const [saliendo, setSaliendo] = useState(false)
  const salida = useRef(null)

  const cerrar = useCallback(() => {
    if (!alCerrar || salida.current) return
    setSaliendo(true)
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    salida.current = setTimeout(alCerrar, reducido ? 0 : SALIDA_MS)
  }, [alCerrar])

  useEffect(() => () => clearTimeout(salida.current), [])

  useEffect(() => {
    if (!duracion || !alCerrar || tipo === 'error') return undefined
    let restante = duracion
    let inicio = Date.now()
    let t = setTimeout(cerrar, restante)
    const alVisibilidad = () => {
      if (document.hidden) { clearTimeout(t); restante -= Date.now() - inicio }
      else { inicio = Date.now(); t = setTimeout(cerrar, Math.max(restante, 1500)) }
    }
    document.addEventListener('visibilitychange', alVisibilidad)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', alVisibilidad) }
  }, [duracion, alCerrar, tipo, cerrar])

  return (
    <div
      className={`aviso aviso-${tipo}${flotante ? ' aviso-flotante' : ''}`}
      role={tipo === 'error' ? 'alert' : 'status'}
      data-saliendo={saliendo || undefined}
    >
      <Icono tipo={tipo} />
      <div className="aviso-texto">
        {titulo && <p className="aviso-titulo">{titulo}</p>}
        {children && <div className="aviso-cuerpo">{children}</div>}
      </div>
      {alCerrar && (
        <button type="button" className="aviso-cerrar" onClick={cerrar} aria-label="Cerrar aviso">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7L7 17" /></svg>
        </button>
      )}
    </div>
  )
}
