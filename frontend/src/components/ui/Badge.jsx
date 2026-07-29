import { clasesEstado, etiquetaEstado } from '../../lib/estados.js'

/** Distintivo de estado. Siempre lleva texto: el color no es el único indicador. */
export function BadgeEstado({ estado, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${clasesEstado(estado)} ${className}`}
    >
      {etiquetaEstado(estado)}
    </span>
  )
}

export function Badge({ children, tono = 'neutro', className = '' }) {
  const tonos = {
    neutro: 'bg-slate-100 text-slate-700 border-slate-200',
    verde: 'bg-verde-100 text-verde-800 border-verde-200',
    arena: 'bg-arena-100 text-slate-700 border-arena-200',
    ambar: 'bg-amber-100 text-amber-800 border-amber-200',
    rojo: 'bg-rose-100 text-rose-800 border-rose-200',
    azul: 'bg-sky-100 text-sky-800 border-sky-200',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tonos[tono]} ${className}`}
    >
      {children}
    </span>
  )
}
