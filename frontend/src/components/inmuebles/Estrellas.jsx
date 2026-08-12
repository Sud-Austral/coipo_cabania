/**
 * Valoración con estrellas.
 *
 * `Estrellas` solo muestra (lectura); `SelectorEstrellas` permite elegir una
 * nota. El color nunca es el único indicador: siempre acompaña un texto con
 * el promedio o la nota elegida (guía de accesibilidad, INSUMO/ui_ux.md).
 */
import { useState } from 'react'
import { Star } from 'lucide-react'

const NOTAS = [1, 2, 3, 4, 5]

export function Estrellas({ valor = 0, total = null, tamano = 15, className = '' }) {
  const llenas = Math.round(valor)
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-flex" aria-hidden="true">
        {NOTAS.map((n) => (
          <Star
            key={n}
            size={tamano}
            className={n <= llenas ? 'text-amber-500' : 'text-slate-300'}
            fill={n <= llenas ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span className="tabular text-sm text-slate-600">
        {valor.toFixed(1)}
        {total !== null && ` (${total})`}
      </span>
      <span className="sr-only">
        {valor.toFixed(1)} de 5 estrellas
        {total !== null && `, ${total} valoraciones`}
      </span>
    </span>
  )
}

export function SelectorEstrellas({ valor = 0, onCambiar, tamano = 28 }) {
  const [previa, setPrevia] = useState(0)
  const activas = previa || valor
  return (
    <div>
      <div className="flex items-center gap-1" role="group" aria-label="Nota de la estadía">
        {NOTAS.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            aria-pressed={valor === n}
            onClick={() => onCambiar(n)}
            onMouseEnter={() => setPrevia(n)}
            onMouseLeave={() => setPrevia(0)}
            onFocus={() => setPrevia(n)}
            onBlur={() => setPrevia(0)}
            className="cursor-pointer rounded p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-verde-500"
          >
            <Star
              size={tamano}
              className={n <= activas ? 'text-amber-500' : 'text-slate-300'}
              fill={n <= activas ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 text-sm text-slate-600" aria-live="polite">
        {valor === 0 ? 'Seleccione una nota de 1 a 5.' : `Nota elegida: ${valor} de 5.`}
      </p>
    </div>
  )
}
