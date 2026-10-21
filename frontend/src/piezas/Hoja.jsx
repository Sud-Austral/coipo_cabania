/* Hoja: ventana sobre la página (<dialog> nativo: foco atrapado y Esc de serie).
   En móvil sube desde abajo. `pie` lleva los botones; el primero de la derecha es la acción. */
import { useEffect, useRef } from 'react'

export default function Hoja({ abierta, titulo, sub, alCerrar, pie, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierta && !d.open) d.showModal()
    if (!abierta && d.open) d.close()
  }, [abierta])
  return (
    <dialog ref={ref} className="cb-hoja" onClose={alCerrar} onCancel={(e) => { e.preventDefault(); alCerrar?.() }}
      onClick={(e) => { if (e.target === ref.current) alCerrar?.() }} aria-labelledby="cb-hoja-titulo">
      {abierta && (
        <div className="cb-hoja-caja">
          <header className="cb-hoja-cab">
            <div>
              <h2 id="cb-hoja-titulo">{titulo}</h2>
              {sub && <p>{sub}</p>}
            </div>
            <button type="button" className="cb-cerrar" onClick={alCerrar} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="cb-hoja-cuerpo">{children}</div>
          {pie && <footer className="cb-hoja-pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  )
}
