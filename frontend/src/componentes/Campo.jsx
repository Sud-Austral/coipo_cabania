/* Campo — etiqueta, control, ayuda y error, cableados entre sí. Ver `Campo.css`.
 *
 * El problema que resuelve no es visual: en la flota el error se pinta en rojo
 * pero el lector de pantalla no lo oye, porque nadie une el mensaje al control.
 * Aquí la unión la hace el componente (`aria-describedby`, `aria-invalid`), así
 * que una vista no puede olvidarla.
 */

import { useId } from 'react'
import './Campo.css'

/**
 * @param {object} props
 * @param {string} props.etiqueta          texto visible; nunca sólo un placeholder
 * @param {string} [props.ayuda]           pista bajo el control
 * @param {string} [props.error]           mensaje; si existe, el campo queda inválido
 * @param {boolean} [props.requerido]
 * @param {'input'|'select'|'textarea'} [props.como]
 * @param {import('react').ReactNode} [props.prefijo]  ícono decorativo dentro del control
 */
export default function Campo({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  como = 'input',
  prefijo,
  children,
  ...resto
}) {
  const id = useId()
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = error ? `${id}-error` : undefined
  const Control = como
  return (
    <div className={error ? 'campo campo-con-error' : 'campo'}>
      <label className="campo-etiqueta" htmlFor={id}>
        {etiqueta}
        {/* El asterisco es para la vista; el lector ya oye `required`. */}
        {requerido && <span className="campo-requerido" aria-hidden="true"> *</span>}
      </label>
      <div className={prefijo ? 'campo-caja con-prefijo' : 'campo-caja'}>
      {prefijo && <span className="campo-prefijo" aria-hidden="true">{prefijo}</span>}
      <Control
        id={id}
        className="campo-control"
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idError, idAyuda].filter(Boolean).join(' ') || undefined}
        {...resto}
      >
        {children}
      </Control>
      </div>
      {ayuda && <p className="campo-ayuda" id={idAyuda}>{ayuda}</p>}
      {/* El error va ANTES en `aria-describedby`: es lo primero que hay que oír. */}
      {error && (
        <p className="campo-error" id={idError}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.4v.1" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
