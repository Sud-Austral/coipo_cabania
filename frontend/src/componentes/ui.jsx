import { Link } from 'react-router-dom'
import { ESTADOS } from '../lib/reglas.js'

const VARIANTES = {
  primario: 'bg-verde-700 text-white hover:bg-verde-800 disabled:bg-stone-300 disabled:text-stone-500',
  secundario: 'bg-white text-tinta-900 ring-1 ring-inset ring-borde hover:bg-stone-50 disabled:text-stone-400',
  texto: 'text-verde-700 hover:bg-verde-50 disabled:text-stone-400',
  textoPeligro: 'text-error-700 hover:bg-error-50',
  peligro: 'bg-white text-error-700 ring-1 ring-inset ring-error-700/30 hover:bg-error-50',
}

export function Boton({ variante = 'primario', a, className = '', children, ...props }) {
  const clases = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`
  if (a) {
    return (
      <Link to={a} className={clases} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={clases} {...props}>
      {children}
    </button>
  )
}

export function Estado({ estado }) {
  const e = ESTADOS[estado]
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${e.clase}`}>{e.etiqueta}</span>
}

export function Tarjeta({ className = '', children }) {
  return <div className={`rounded-xl border border-borde bg-white ${className}`}>{children}</div>
}

export function Aviso({ tipo = 'alerta', children }) {
  const c = tipo === 'error' ? 'bg-error-50 text-error-700' : tipo === 'info' ? 'bg-verde-50 text-verde-800' : 'bg-alerta-50 text-alerta-700'
  return <div className={`rounded-lg px-4 py-3 text-[15px] leading-snug ${c}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Campo({ etiqueta, ayuda, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-tinta-700">{etiqueta}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-error-700">{error}</span> : ayuda ? <span className="mt-1 block text-sm text-tinta-500">{ayuda}</span> : null}
    </label>
  )
}

/** Selector de filtro de ancho propio (no ocupa toda la fila). */
export const claseFiltro =
  'block min-h-11 rounded-lg border border-borde bg-white px-3 text-[15px] text-tinta-900 focus:border-verde-600 focus:outline-none focus:ring-2 focus:ring-verde-200'

export const claseEntrada =
  'block min-h-11 w-full rounded-lg border border-borde bg-white px-3 text-[15px] text-tinta-900 placeholder:text-tinta-400 focus:border-verde-600 focus:outline-none focus:ring-2 focus:ring-verde-200'
