import { useEffect } from 'react'
import { REGIONES } from '../../datos/casas.js'
import { diasEntre, hoyISO } from '../../lib/fechas.js'

export const nombreRegion = (c) => REGIONES.find((r) => r.codigo === c)?.nombre ?? '—'

/** 'hoy', 'ayer', 'hace 3 días' */
export function antiguedad(isoFechaHora) {
  const d = diasEntre(isoFechaHora.slice(0, 10), hoyISO())
  if (d <= 0) return `hoy, ${isoFechaHora.slice(11, 16)}`
  if (d === 1) return `ayer, ${isoFechaHora.slice(11, 16)}`
  return `hace ${d} días`
}

export function Dialogo({ titulo, children, onCerrar }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}>
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
