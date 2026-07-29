import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/** Ventana modal con cierre por Escape, clic en el velo y foco inicial. */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie }) {
  const contenedor = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    contenedor.current?.focus()
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-arena-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-verde-900">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-sm text-slate-600">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-arena-50 hover:text-slate-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {pie && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-arena-200 bg-arena-50 px-5 py-3.5">
            {pie}
          </div>
        )}
      </div>
    </div>
  )
}
